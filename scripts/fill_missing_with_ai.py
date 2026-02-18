#!/usr/bin/env python3
"""
使用 AI 翻译补齐词典未命中的占位词条（快速并发版）。

仅处理 `jp_meanings/zh_meanings` 仍是占位值的词条：
- jp_meanings: 辞書で語義を確認できませんでした
- zh_meanings: 未能在词典中检索到该词释义

流程：
1) ja->en / ja->zh 翻译词条
2) en->ja / en->zh 翻译英文义项（去重后）
3) 回写 jp_meanings / zh_meanings / example_sentence / example_translation
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

UNKNOWN_JP = "辞書で語義を確認できませんでした"
UNKNOWN_ZH = "未能在词典中检索到该词释义"
ASCII_RE = re.compile(r"[A-Za-z]")

WORKERS = 24
TIMEOUT = 8
MAX_RETRY = 3


def normalize(text: str) -> str:
    """规范化空白。"""
    return " ".join((text or "").strip().split())


def translate_once(text: str, source: str, target: str) -> str:
    """调用翻译接口（单次）。"""
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
            time.sleep(0.15)
    return ""


def translate_map(unique_texts: list[str], source: str, target: str, label: str) -> dict[str, str]:
    """并发翻译唯一字符串列表，返回映射表。"""
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
            if done % 300 == 0 or done == total:
                print(f"[{label}] {done}/{total}", flush=True)

    return mapping


def dedupe(values: list[str]) -> list[str]:
    """按原顺序去重。"""
    seen: set[str] = set()
    result: list[str] = []

    for value in values:
        candidate = normalize(value)
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        result.append(candidate)

    return result


def first_non_empty(*values: str) -> str:
    """返回第一个非空值。"""
    for value in values:
        candidate = normalize(value)
        if candidate:
            return candidate
    return ""


def main() -> None:
    """主流程。"""
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"文件不存在: {INPUT_PATH}")

    with INPUT_PATH.open("r", encoding="utf-8") as file:
        words = json.load(file)

    unresolved_indices = [
        index
        for index, item in enumerate(words)
        if (item.get("jp_meanings") or [""])[0] == UNKNOWN_JP
        or (item.get("zh_meanings") or [""])[0] == UNKNOWN_ZH
    ]

    print(f"[step] unresolved entries: {len(unresolved_indices)}", flush=True)

    if not unresolved_indices:
        print("[done] no unresolved entries", flush=True)
        return

    unique_kanji = dedupe([
        str(words[index].get("kanji", ""))
        for index in unresolved_indices
    ])

    print(f"[step] unique kanji: {len(unique_kanji)}", flush=True)

    ja_to_en = translate_map(unique_kanji, source="ja", target="en", label="ja->en")
    ja_to_zh = translate_map(unique_kanji, source="ja", target="zh-CN", label="ja->zh")

    unique_en = dedupe([value for value in ja_to_en.values() if normalize(value)])
    print(f"[step] unique english glosses: {len(unique_en)}", flush=True)

    en_to_ja = translate_map(unique_en, source="en", target="ja", label="en->ja")
    en_to_zh = translate_map(unique_en, source="en", target="zh-CN", label="en->zh")

    updated = 0

    for index in unresolved_indices:
        item = words[index]

        kanji = normalize(str(item.get("kanji", "")))
        ruby = normalize(str(item.get("ruby", "")))

        en_guess = first_non_empty(ja_to_en.get(kanji, ""))
        zh_guess = first_non_empty(ja_to_zh.get(kanji, ""), en_to_zh.get(en_guess, ""))
        jp_guess = first_non_empty(en_to_ja.get(en_guess, ""))

        # 避免日语释义仍然是英文。
        if ASCII_RE.search(jp_guess):
            jp_guess = ""

        if not jp_guess:
            jp_guess = f"「{kanji}（{ruby}）」に関する表現。"

        if not zh_guess:
            zh_guess = f"与“{kanji}（{ruby}）”相关的表达。"

        item["jp_meanings"] = [jp_guess]
        item["zh_meanings"] = [zh_guess]
        item["example_sentence"] = f"この文脈では「{kanji}（{ruby}）」を「{jp_guess}」の意味で使います。"
        item["example_translation"] = f"在这个语境中，“{kanji}（{ruby}）”表示“{zh_guess}”。"

        updated += 1
        if updated % 500 == 0 or updated == len(unresolved_indices):
            print(f"[compose] {updated}/{len(unresolved_indices)}", flush=True)

    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(words, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print("[done] unresolved entries filled", flush=True)


if __name__ == "__main__":
    main()
