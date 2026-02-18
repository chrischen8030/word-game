#!/usr/bin/env python3
"""
全量改写 parsed_words_11620.json：
- 使用 AI 翻译重建全部 jp_meanings / zh_meanings
- 使用多模板场景句重建 example_sentence / example_translation

注意：本脚本会覆盖现有释义和例句字段。
"""

from __future__ import annotations

import concurrent.futures
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

INPUT_PATH = Path("parsed_words_11620.json")
OUTPUT_PATH = Path("parsed_words_11620.json")

WORKERS = 24
TIMEOUT = 8
MAX_RETRY = 3

ASCII_RE = re.compile(r"[A-Za-z]")
EN_SPLIT_RE = re.compile(r"\s*(?:;|,|/|\||\bor\b|\band\b)\s*", re.IGNORECASE)
ZH_SPLIT_RE = re.compile(r"\s*(?:；|;|，|、|/|\|)\s*")

CONTEXTS = [
    ("職場", "职场"),
    ("学校", "学校"),
    ("旅行", "旅行"),
    ("ニュース", "新闻"),
    ("日常会話", "日常对话"),
    ("SNS", "社交媒体"),
]

VERB_TEMPLATES_JP = [
    "{ctx}の会話では、「{word}」を使うと「{meaning}」という行為を自然に伝えられます。",
    "実用例：{ctx}で状況を説明するとき、「{word}」は「{meaning}」の意味でよく使われます。",
    "{ctx}の場面で「{word}」と言えば、「{meaning}」というニュアンスが相手に伝わります。",
]
VERB_TEMPLATES_ZH = [
    "在{ctx}里，使用“{word}”可以自然表达“{meaning}”这个动作含义。",
    "实用例：在{ctx}描述情况时，“{word}”常用来表示“{meaning}”。",
    "在{ctx}交流中，说“{word}”通常就是“{meaning}”这个意思。",
]

NOUN_TEMPLATES_JP = [
    "{ctx}では、「{word}」は「{meaning}」を表す語としてよく出てきます。",
    "実用例：{ctx}で説明するとき、「{word}」を使うと「{meaning}」を短く伝えられます。",
    "{ctx}の文脈で「{word}」を見たら、「{meaning}」として理解すると分かりやすいです。",
]
NOUN_TEMPLATES_ZH = [
    "在{ctx}中，“{word}”常用来表示“{meaning}”。",
    "实用例：在{ctx}说明情况时，用“{word}”可以更简洁地表达“{meaning}”。",
    "在{ctx}语境里看到“{word}”时，通常可理解为“{meaning}”。",
]

ADJ_TEMPLATES_JP = [
    "{ctx}の説明では、「{word}」を使って状態を「{meaning}」と表現できます。",
    "実用例：{ctx}で様子を伝えるとき、「{word}」は「{meaning}」のニュアンスで使えます。",
    "{ctx}の会話で「{word}」を使うと、「{meaning}」という評価を自然に示せます。",
]
ADJ_TEMPLATES_ZH = [
    "在{ctx}描述状态时，“{word}”可以表达“{meaning}”这种感觉。",
    "实用例：在{ctx}交流中，“{word}”常用于传达“{meaning}”的语气。",
    "在{ctx}对话里，使用“{word}”能自然体现“{meaning}”这一评价。",
]


def normalize(text: str) -> str:
    """统一空白和首尾空格。"""
    return " ".join((text or "").strip().split())


def dedupe(values: list[str]) -> list[str]:
    """按原顺序去重并去空。"""
    seen: set[str] = set()
    result: list[str] = []

    for value in values:
        candidate = normalize(value)
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        result.append(candidate)

    return result


def stable_seed(text: str) -> int:
    """稳定哈希，用于模板选择。"""
    return sum(ord(ch) for ch in text)


def translate_once(text: str, source: str, target: str) -> str:
    """调用轻量翻译接口。"""
    if not text:
        return ""

    encoded = urllib.parse.quote(text)
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl={source}&tl={target}&dt=t&q={encoded}"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        payload = json.loads(response.read().decode("utf-8"))

    segments = payload[0] if payload and isinstance(payload, list) else []
    translated = "".join(segment[0] for segment in segments if segment and len(segment) > 0)

    return normalize(translated)


def safe_translate(text: str, source: str, target: str) -> str:
    """翻译重试包装。"""
    for _ in range(MAX_RETRY):
        try:
            return translate_once(text, source, target)
        except Exception:
            time.sleep(0.12)
    return ""


def translate_map(unique_texts: list[str], source: str, target: str, label: str) -> dict[str, str]:
    """并发翻译唯一文本列表。"""
    mapping: dict[str, str] = {}
    total = len(unique_texts)
    done = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {
            executor.submit(safe_translate, text, source, target): text
            for text in unique_texts
        }

        for future in concurrent.futures.as_completed(futures):
            text = futures[future]
            try:
                mapping[text] = future.result()
            except Exception:
                mapping[text] = ""

            done += 1
            if done % 400 == 0 or done == total:
                print(f"[{label}] {done}/{total}", flush=True)

    return mapping


def split_english_meanings(en_text: str) -> list[str]:
    """把英文释义粗分为多义项。"""
    cleaned = normalize(en_text)
    if not cleaned:
        return []

    parts = [normalize(part) for part in EN_SPLIT_RE.split(cleaned)]
    parts = [part for part in parts if part and part.lower() not in {"to", "the", "a", "an"}]

    if not parts:
        parts = [cleaned]

    return dedupe(parts)[:3]


def split_zh_meanings(zh_text: str) -> list[str]:
    """把中文释义粗分为多义项。"""
    cleaned = normalize(zh_text)
    if not cleaned:
        return []

    parts = [normalize(part) for part in ZH_SPLIT_RE.split(cleaned)]
    parts = [part for part in parts if part]

    if not parts:
        parts = [cleaned]

    return dedupe(parts)[:3]


def infer_word_type(ruby: str) -> str:
    """根据读音尾部做粗粒度词性推断。"""
    r = normalize(ruby)

    if r.endswith("する") or r.endswith("ずる"):
        return "verb"

    if r.endswith(("う", "く", "ぐ", "す", "つ", "ぬ", "ぶ", "む", "る")):
        return "verb"

    if r.endswith("い"):
        return "adj"

    return "noun"


def build_examples(kanji: str, ruby: str, jp_meaning: str, zh_meaning: str) -> tuple[str, str]:
    """生成更实用的场景化例句。"""
    seed = stable_seed(f"{kanji}:{ruby}:{jp_meaning}")
    ctx_jp, ctx_zh = CONTEXTS[seed % len(CONTEXTS)]

    word = f"{kanji}（{ruby}）"
    word_type = infer_word_type(ruby)

    if word_type == "verb":
        jp_tpl = VERB_TEMPLATES_JP[(seed // len(CONTEXTS)) % len(VERB_TEMPLATES_JP)]
        zh_tpl = VERB_TEMPLATES_ZH[(seed // len(CONTEXTS)) % len(VERB_TEMPLATES_ZH)]
    elif word_type == "adj":
        jp_tpl = ADJ_TEMPLATES_JP[(seed // len(CONTEXTS)) % len(ADJ_TEMPLATES_JP)]
        zh_tpl = ADJ_TEMPLATES_ZH[(seed // len(CONTEXTS)) % len(ADJ_TEMPLATES_ZH)]
    else:
        jp_tpl = NOUN_TEMPLATES_JP[(seed // len(CONTEXTS)) % len(NOUN_TEMPLATES_JP)]
        zh_tpl = NOUN_TEMPLATES_ZH[(seed // len(CONTEXTS)) % len(NOUN_TEMPLATES_ZH)]

    jp_sentence = jp_tpl.format(ctx=ctx_jp, word=word, meaning=jp_meaning)
    zh_sentence = zh_tpl.format(ctx=ctx_zh, word=word, meaning=zh_meaning)

    return jp_sentence, zh_sentence


def choose_first_non_empty(*values: str) -> str:
    """返回第一个非空值。"""
    for value in values:
        candidate = normalize(value)
        if candidate:
            return candidate
    return ""


def main() -> None:
    """主流程：全量 AI 重建释义与例句。"""
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"文件不存在: {INPUT_PATH}")

    with INPUT_PATH.open("r", encoding="utf-8") as file:
        words = json.load(file)

    unique_kanji = dedupe([str(item.get("kanji", "")) for item in words])

    print(f"[step] total words: {len(words)}", flush=True)
    print(f"[step] unique kanji: {len(unique_kanji)}", flush=True)

    kanji_to_en = translate_map(unique_kanji, source="ja", target="en", label="ja->en")
    kanji_to_zh = translate_map(unique_kanji, source="ja", target="zh-CN", label="ja->zh")

    # 从英文释义中拆分候选义项，再统一翻译回日中。
    all_en_parts: list[str] = []
    for kanji in unique_kanji:
        all_en_parts.extend(split_english_meanings(kanji_to_en.get(kanji, "")))

    unique_en_parts = dedupe(all_en_parts)

    print(f"[step] unique english meaning parts: {len(unique_en_parts)}", flush=True)

    en_to_ja = translate_map(unique_en_parts, source="en", target="ja", label="en->ja")
    en_to_zh = translate_map(unique_en_parts, source="en", target="zh-CN", label="en->zh")

    print("[step] composing fields", flush=True)

    for index, item in enumerate(words, start=1):
        kanji = normalize(str(item.get("kanji", "")))
        ruby = normalize(str(item.get("ruby", "")))

        en_text = choose_first_non_empty(kanji_to_en.get(kanji, ""))
        zh_direct = choose_first_non_empty(kanji_to_zh.get(kanji, ""))

        en_parts = split_english_meanings(en_text)

        jp_meanings = dedupe([en_to_ja.get(part, "") for part in en_parts])[:3]
        zh_meanings_from_en = dedupe([en_to_zh.get(part, "") for part in en_parts])[:3]
        zh_meanings_direct = split_zh_meanings(zh_direct)

        # 中文优先使用 ja->zh 直译，其次 en->zh。
        zh_meanings = dedupe(zh_meanings_direct + zh_meanings_from_en)[:3]

        if not jp_meanings:
            jp_meanings = [f"{kanji}に関する表現"]

        # 避免日语释义残留英文。
        jp_meanings = [meaning for meaning in jp_meanings if not ASCII_RE.search(meaning)] or [f"{kanji}に関する表現"]

        if not zh_meanings:
            zh_meanings = [f"与“{kanji}（{ruby}）”相关的表达"]

        item["jp_meanings"] = jp_meanings
        item["zh_meanings"] = zh_meanings

        example_sentence, example_translation = build_examples(
            kanji=kanji,
            ruby=ruby,
            jp_meaning=jp_meanings[0],
            zh_meaning=zh_meanings[0],
        )

        item["example_sentence"] = example_sentence
        item["example_translation"] = example_translation

        if index % 1000 == 0 or index == len(words):
            print(f"[compose] {index}/{len(words)}", flush=True)

    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(words, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print("[done] rewritten all meanings and examples with AI", flush=True)


if __name__ == "__main__":
    main()
