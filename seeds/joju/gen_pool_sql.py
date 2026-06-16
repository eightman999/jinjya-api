#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""omikuji.csv から D1 永続プール(omikuji テーブル)投入用の SQL を生成する。

出力: seed_pool.sql
  - 先頭で当該神社ぶんを DELETE するので、何度流しても重複しない（冪等）。
  - 適用例:
      wrangler d1 execute jinjya-db --remote --file=seeds/joju/seed_pool.sql
      wrangler d1 execute JINJYA_DB --local  --file=seeds/joju/seed_pool.sql --config wrangler.test.jsonc
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TAG_KEYS = ["仕事", "学業", "試験", "対人"]
EXTRA_KEYS = ["ラッキーアイテム", "ラッキーカラー", "吉方位", "開運数字"]


def sql_str(s: str) -> str:
    """SQL のシングルクォート文字列にエスケープして返す。"""
    return "'" + s.replace("'", "''") + "'"


def main():
    rows = list(csv.DictReader(open(os.path.join(HERE, "omikuji.csv"), encoding="utf-8")))
    jinjya_ids = sorted({r["jinjya"] for r in rows})

    # 注意: D1(remote) は SQL の BEGIN TRANSACTION/COMMIT を禁止しているため使わない。
    # wrangler d1 execute --file は各文を順に実行する（DELETE→INSERT で冪等）。
    lines = ["-- 自動生成: gen_pool_sql.py（omikuji.csv より）"]
    for jid in jinjya_ids:
        lines.append(f"DELETE FROM omikuji WHERE jinjya = {sql_str(jid)};")

    for r in rows:
        tags = {k: r[k] for k in TAG_KEYS if r.get(k)}
        extra = {k: r[k] for k in EXTRA_KEYS if r.get(k)}
        lines.append(
            "INSERT INTO omikuji (jinjya, fortune, message, tags, extra) VALUES ("
            + ", ".join([
                sql_str(r["jinjya"]),
                sql_str(r["fortune"]),
                sql_str(r["message"]),
                sql_str(json.dumps(tags, ensure_ascii=False)),
                sql_str(json.dumps(extra, ensure_ascii=False)),
            ])
            + ");"
        )

    out = os.path.join(HERE, "seed_pool.sql")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"wrote {len(rows)} INSERTs for {jinjya_ids} -> {out}")


if __name__ == "__main__":
    main()
