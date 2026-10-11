#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MohtavaTelBot/mtproto_download.py
دانلود مستقیم فایل‌های حجیم تلگرام (بالای ۲۰ مگابایت تا سقف ۲ گیگابایت)
از طریق پروتکل MTProto (Telethon) با استفاده از Bot Token بدون محدودیت Bot HTTP API.
"""

import argparse
import asyncio
import hashlib
import os
import sys
import tempfile


async def download_from_mtproto(token: str, chat_id: int, message_id: int, dest_path: str):
    from telethon import TelegramClient

    # API ID و API Hash رسمی دسکتاپ تلگرام برای نشست MTProto ربات
    api_id = 2040
    api_hash = "b18441a1ff607e10a989891a5462e627"

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()[:12]
    session_file = os.path.join(tempfile.gettempdir(), f"mohtava_mtproto_{token_hash}")

    client = TelegramClient(session_file, api_id, api_hash)
    await client.start(bot_token=token)
    try:
        msg = await client.get_messages(int(chat_id), ids=int(message_id))
        if not msg or not getattr(msg, "media", None):
            raise RuntimeError(f"Message {message_id} in chat {chat_id} has no media.")

        os.makedirs(os.path.dirname(os.path.abspath(dest_path)), exist_ok=True)
        downloaded = await client.download_media(msg, file=dest_path)
        if not downloaded or not os.path.exists(dest_path):
            raise RuntimeError("Failed to download media via MTProto.")
        print(f"OK:{dest_path}", flush=True)
    finally:
        await client.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Download large Telegram bot files via MTProto")
    parser.add_argument("--token", required=True, help="Telegram Bot Token")
    parser.add_argument("--chat-id", required=True, type=int, help="Chat ID")
    parser.add_argument("--message-id", required=True, type=int, help="Message ID")
    parser.add_argument("--dest", required=True, help="Destination file path")
    args = parser.parse_args()

    try:
        asyncio.run(download_from_mtproto(args.token, args.chat_id, args.message_id, args.dest))
    except Exception as exc:
        print(f"ERROR:{exc}", file=sys.stderr, flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
