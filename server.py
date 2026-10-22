#!/usr/bin/env python3
"""Мини-сервер для гайда.

Примеры:
    python3 server.py                    # порт 8000, браузер откроется сам
    python3 server.py -p 3000            # другой порт
    python3 server.py --host 0.0.0.0     # доступ с телефона в той же Wi-Fi
    python3 server.py --no-browser       # не открывать браузер
    python3 server.py --quiet            # без логов запросов
"""

import argparse
import http.server
import socketserver
import webbrowser
import os
import socket
from pathlib import Path


def get_local_ip() -> str:
    """Узнать локальный IP для доступа с телефона."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Тот же SimpleHTTPRequestHandler, но без спама ConnectionResetError
    при жёсткой перезагрузке страницы (F5 / Ctrl+Shift+R)."""

    quiet = False

    # Сигнатура 1-в-1 как в BaseHTTPRequestHandler: параметр обязан
    # называться `format`, иначе Pylance/mypy ругаются на override.
    # noinspection PyShadowingBuiltins
    def log_message(self, format: str, *args) -> None:  # noqa: A002
        if not self.quiet:
            super().log_message(format, *args)

    def handle_one_request(self) -> None:
        try:
            super().handle_one_request()
        except (ConnectionResetError, BrokenPipeError):
            # Браузер закрыл соединение — это нормально, не выводим traceback
            self.close_connection = True


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Многопоточный сервер с allow_reuse_address — можно перезапускать
    сразу, без ожидания TIME_WAIT (~60 секунд у стандартного TCPServer)."""
    daemon_threads = True
    allow_reuse_address = True


def main() -> None:
    parser = argparse.ArgumentParser(description="Мини-сервер для гайда")
    parser.add_argument("-p", "--port", type=int, default=8000,
                        help="Порт (по умолчанию 8000)")
    parser.add_argument("--host", default="127.0.0.1",
                        help="Хост: 127.0.0.1 (только локально) или 0.0.0.0 (вся сеть)")
    parser.add_argument("--no-browser", action="store_true",
                        help="Не открывать браузер")
    parser.add_argument("--quiet", action="store_true",
                        help="Не логировать запросы")
    args = parser.parse_args()

    # Всегда работаем из папки скрипта
    os.chdir(Path(__file__).parent)

    QuietHandler.quiet = args.quiet

    try:
        with ThreadingHTTPServer((args.host, args.port), QuietHandler) as httpd:
            url = f"http://localhost:{args.port}"
            print()
            print("🌸 Сервер запущен")
            print(f"📁 {os.getcwd()}")
            print(f"🔗 {url}")
            if args.host == "0.0.0.0":
                print(f"📱 С телефона: http://{get_local_ip()}:{args.port}")
            print("⛔ Остановить: Ctrl+C")
            print()
            if not args.no_browser:
                webbrowser.open(url)
            httpd.serve_forever()
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Порт {args.port} занят. Попробуй: python3 server.py -p {args.port + 1}")
        else:
            raise
    except KeyboardInterrupt:
        print("\n👋 Сервер остановлен.")


if __name__ == "__main__":
    main()