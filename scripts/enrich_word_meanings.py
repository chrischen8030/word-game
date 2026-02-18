#!/usr/bin/env python3
"""
为 parsed_words_11620.json 批量补全：
- 日语意思（jp_meanings）
- 中文意思（zh_meanings）
- 例句（example_sentence）
- 例句翻译（example_translation）

实现说明：
1) 使用本地 JMdict（jamdict-data）提取英文义项（支持多义项）
2) 用 Argos 模型把英文义项翻译成日文、中文
3) 对词典未命中的词条写入“未检索到释义”提示
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import jamdict_data
from argostranslate import translate
from jamdict import Jamdict

INPUT_PATH = Path("parsed_words_11620.json")
OUTPUT_PATH = Path("parsed_words_11620.json")

MAX_MEANINGS = 5
MAX_SENSES = 8
MAX_DEFS_PER_SENSE = 4


@dataclass
class MeaningBundle:
    """统一保存一个词条的释义中间结果。"""

    en_meanings: list[str]
    found: bool


def normalize_text(text: str) -> str:
    """规范化文本，避免重复义项。"""
    return " ".join(text.strip().split())


def dedupe_preserve_order(items: list[str]) -> list[str]:
    """按原始顺序去重。"""
    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        key = item.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(key)

    return result


def score_jam_entry(entry: Any, kanji: str, ruby: str) -> int:
    """按汉字/读音匹配程度给 jamdict 词条打分。"""
    score = 0
    kanji_forms = [k.text for k in entry.kanji_forms]
    kana_forms = [k.text for k in entry.kana_forms]

    if kanji in kanji_forms:
        score += 8
    if ruby in kana_forms:
        score += 8

    if any(kanji in form or form in kanji for form in kanji_forms):
        score += 2
    if any(ruby in form or form in ruby for form in kana_forms):
        score += 2

    return score


def extract_from_jam_entry(entry: Any) -> MeaningBundle:
    """从 jamdict 词条提取多义项英文释义。"""
    en_meanings: list[str] = []

    for sense in entry.senses[:MAX_SENSES]:
        glosses = [normalize_text(gloss.text) for gloss in sense.gloss if getattr(gloss, "lang", "eng") == "eng"]
        glosses = [g for g in glosses if g]

        if glosses:
            en_meanings.append("; ".join(glosses[:MAX_DEFS_PER_SENSE]))

    en_meanings = dedupe_preserve_order(en_meanings)[:MAX_MEANINGS]
    return MeaningBundle(en_meanings=en_meanings, found=bool(en_meanings))


def choose_best_jam_bundle(entries: list[Any], kanji: str, ruby: str) -> MeaningBundle:
    """在多个 jamdict 候选中挑选最匹配词条。"""
    if not entries:
        return MeaningBundle(en_meanings=[], found=False)

    ranked = sorted(entries, key=lambda entry: score_jam_entry(entry, kanji, ruby), reverse=True)

    for entry in ranked:
        bundle = extract_from_jam_entry(entry)
        if bundle.found:
            return bundle

    return MeaningBundle(en_meanings=[], found=False)


def build_translation_map(unique_en_texts: list[str]) -> tuple[dict[str, str], dict[str, str]]:
    """把英文释义翻译成日语、中文。"""
    installed_languages = translate.get_installed_languages()
    en_lang = next(lang for lang in installed_languages if lang.code == "en")
    ja_lang = next(lang for lang in installed_languages if lang.code == "ja")
    zh_lang = next(lang for lang in installed_languages if lang.code == "zh")

    en_to_ja = en_lang.get_translation(ja_lang)
    en_to_zh = en_lang.get_translation(zh_lang)

    ja_map: dict[str, str] = {}
    zh_map: dict[str, str] = {}
    total = len(unique_en_texts)

    for idx, text in enumerate(unique_en_texts, start=1):
        try:
            ja_map[text] = normalize_text(en_to_ja.translate(text)) or text
        except Exception:
            ja_map[text] = text

        try:
            zh_map[text] = normalize_text(en_to_zh.translate(text)) or text
        except Exception:
            zh_map[text] = text

        if idx % 500 == 0 or idx == total:
            print(f"[translate] {idx}/{total}", flush=True)

    return ja_map, zh_map


def build_example_sentence(kanji: str, ruby: str, first_ja: str, first_zh: str, found: bool) -> tuple[str, str]:
    """生成示例句与对应中文翻译。"""
    if not found:
        return (
            f"「{kanji}（{ruby}）」という語は古語または稀な表現として扱われることがあります。",
            f"“{kanji}（{ruby}）”可能是古语或较少见的表达。",
        )

    return (
        f"この文脈では「{kanji}（{ruby}）」を「{first_ja}」の意味で使います。",
        f"在这个语境中，“{kanji}（{ruby}）”表示“{first_zh}”。",
    )


def main() -> None:
    """主流程：词典匹配 -> 义项翻译 -> 回写 JSON。"""
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"输入文件不存在: {INPUT_PATH}")

    with INPUT_PATH.open("r", encoding="utf-8") as file:
        words: list[dict[str, Any]] = json.load(file)

    jam = Jamdict(db_file=jamdict_data.JAMDICT_DB_PATH, auto_expand=False)
    jam_lookup_cache: dict[str, list[Any]] = {}

    def jam_entries(query: str) -> list[Any]:
        if query not in jam_lookup_cache:
            jam_lookup_cache[query] = jam.lookup(query).entries
        return jam_lookup_cache[query]

    bundles: list[MeaningBundle] = []

    print("[step] lookup from jamdict", flush=True)
    for idx, word in enumerate(words, start=1):
        kanji = normalize_text(str(word.get("kanji", "")))
        ruby = normalize_text(str(word.get("ruby", "")))

        bundle = choose_best_jam_bundle(jam_entries(kanji), kanji, ruby)
        if not bundle.found and ruby:
            bundle = choose_best_jam_bundle(jam_entries(ruby), kanji, ruby)

        bundles.append(bundle)

        if idx % 1000 == 0 or idx == len(words):
            print(f"[jamdict] {idx}/{len(words)}", flush=True)

    unresolved_count = sum(1 for bundle in bundles if not bundle.found)
    print(f"[summary] unresolved by jamdict: {unresolved_count}", flush=True)

    unique_en_meanings = dedupe_preserve_order(
        [meaning for bundle in bundles for meaning in bundle.en_meanings]
    )
    print(f"[step] translate meanings: {len(unique_en_meanings)} unique glosses", flush=True)

    ja_map, zh_map = build_translation_map(unique_en_meanings)

    print("[step] compose final fields", flush=True)
    for idx, word in enumerate(words):
        bundle = bundles[idx]
        kanji = normalize_text(str(word.get("kanji", "")))
        ruby = normalize_text(str(word.get("ruby", "")))

        if bundle.found:
            jp_meanings = dedupe_preserve_order([ja_map.get(text, text) for text in bundle.en_meanings])[:MAX_MEANINGS]
            zh_meanings = dedupe_preserve_order([zh_map.get(text, text) for text in bundle.en_meanings])[:MAX_MEANINGS]
        else:
            jp_meanings = ["辞書で語義を確認できませんでした"]
            zh_meanings = ["未能在词典中检索到该词释义"]

        example_ja, example_zh = build_example_sentence(
            kanji=kanji,
            ruby=ruby,
            first_ja=jp_meanings[0],
            first_zh=zh_meanings[0],
            found=bundle.found,
        )

        word["jp_meanings"] = jp_meanings
        word["zh_meanings"] = zh_meanings
        word["example_sentence"] = example_ja
        word["example_translation"] = example_zh

        if idx % 1000 == 0 or idx + 1 == len(words):
            print(f"[compose] {idx + 1}/{len(words)}", flush=True)

    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(words, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print("[done] file updated:", OUTPUT_PATH, flush=True)


if __name__ == "__main__":
    main()
