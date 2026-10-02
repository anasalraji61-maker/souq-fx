#!/usr/bin/env python3
"""
MATRIX Live Coordination Daemon — Git-Backed Synchronization Engine
Architects: Claude (Chief Architect) & Google AI Studio (Execution & Quantitative Co-Architect)
Client / Project Owner: Anas Al-Raji

Runs 24/7 on local laptop or server.
Polls GitHub repository, watches COORDINATION-LIVE.md, handles intermittent internet
with exponential backoff and socket checks (8.8.8.8:53), and logs state to SQLite.
"""

import asyncio
import os
import signal
import socket
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path


class GitBackedSyncDaemon:
    def __init__(self, repo_path: str, coordination_file: str = "COORDINATION-LIVE.md"):
        self.repo_path = Path(repo_path).resolve()
        self.coordination_file = self.repo_path / coordination_file
        self.db_path = self.repo_path / "messages.db"
        self.running = True
        
        # Initialize local SQLite persistence
        self.init_db()
        self.last_git_hash = None
        self.max_retries = 10
        self.retry_delay = 5
        
    def init_db(self):
        """إعداد قاعدة البيانات المحلية للأحداث والمزامنة"""
        self.db = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.db.execute('''
        CREATE TABLE IF NOT EXISTS synced_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME,
            source TEXT,
            commit_hash TEXT,
            content TEXT,
            processed BOOLEAN DEFAULT 0
        )
        ''')
        self.db.commit()
    
    async def is_internet_available(self) -> bool:
        """فحص الاتصال الفعلي بالإنترنت عبر Google DNS (8.8.8.8:53)"""
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None, lambda: socket.create_connection(("8.8.8.8", 53), timeout=3).close()
            )
            return True
        except (OSError, socket.timeout):
            return False
    
    async def git_pull_with_retry(self) -> bool:
        """git pull مع إعادة محاولة تلقائية عند تذبذب الإنترنت"""
        for attempt in range(self.max_retries):
            if not self.running:
                return False
                
            try:
                # إذا انقطع الإنترنت، انتظر واعد المحاولة
                if not await self.is_internet_available():
                    wait_sec = min(self.retry_delay * (attempt + 1), 60)
                    print(f"⏳ [محاولة {attempt + 1}/{self.max_retries}] الإنترنت منقطع حالياً... انتظار {wait_sec} ثانية...")
                    await asyncio.sleep(wait_sec)
                    continue
                
                # هناك اتصال - سحب التحديثات من origin main
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: subprocess.run(
                        ["git", "pull", "--rebase", "origin", "main"],
                        cwd=str(self.repo_path),
                        capture_output=True,
                        text=True,
                        timeout=40
                    )
                )
                
                if result.returncode == 0:
                    output = result.stdout.strip()
                    if "Already up to date" not in output:
                        print(f"✅ git pull نجح مع تحديثات جديدة:\n   {output}")
                    return True
                else:
                    print(f"⚠️ تحذير git pull: {result.stderr.strip()[:200]}")
            
            except Exception as e:
                print(f"⚠️ استثناء أثناء السحب (المحاولة {attempt + 1}): {e}")
            
            await asyncio.sleep(self.retry_delay)
        
        return False
    
    def read_coordination_file(self) -> dict | None:
        """قراءة ملف التنسيق واستخراج آخر Hash"""
        try:
            if not self.coordination_file.exists():
                return None
                
            with open(self.coordination_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            result = subprocess.run(
                ["git", "log", "-1", "--format=%H", str(self.coordination_file)],
                cwd=str(self.repo_path),
                capture_output=True,
                text=True
            )
            current_hash = result.stdout.strip()
            
            return {
                "content": content,
                "current_hash": current_hash,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"❌ خطأ أثناء قراءة ملف التنسيق: {e}")
            return None
    
    def log_update_to_db(self, source: str, content: str, commit_hash: str):
        """حفظ التحديث في SQLite محلياً"""
        try:
            self.db.execute(
                '''INSERT INTO synced_updates 
                   (timestamp, source, commit_hash, content) 
                   VALUES (?, ?, ?, ?)''',
                (datetime.now().isoformat(), source, commit_hash, content)
            )
            self.db.commit()
            print(f"💾 تم حفظ التحديث (Hash: {commit_hash[:8]}) في قاعدة البيانات المحلية messages.db")
        except Exception as e:
            print(f"❌ خطأ في حفظ SQLite: {e}")
    
    def stop(self):
        """إيقاف الـ Daemon بنظافة"""
        print("\n🛑 جاري إيقاف GitBackedSyncDaemon بنظافة...")
        self.running = False
        if hasattr(self, 'db'):
            self.db.close()
    
    async def main_loop(self):
        """الحلقة التنفيذية 24/7"""
        print("=" * 65)
        print("🚀 تشغيل MATRIX Git-Backed Sync Daemon (24/7 Architecture)")
        print(f"📁 مسار المستودع: {self.repo_path}")
        print(f"📄 ملف التنسيق: {self.coordination_file.name}")
        print(f"💾 قاعدة البيانات: {self.db_path.name}")
        print("=" * 65)
        
        while self.running:
            try:
                is_online = await self.is_internet_available()
                status_emoji = "🟢 متصل" if is_online else "🔴 منقطع (جاري الانتظار)"
                now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                print(f"[{now_str}] حالة الشبكة: {status_emoji}", flush=True)
                
                if is_online:
                    pulled = await self.git_pull_with_retry()
                    if pulled:
                        update = self.read_coordination_file()
                        if update and update["current_hash"] and update["current_hash"] != self.last_git_hash:
                            print(f"\n🔔 تم رصد دورة/تحديث جديد في المستودع! (Commit: {update['current_hash'][:8]})")
                            self.log_update_to_db(
                                "github",
                                update["content"],
                                update["current_hash"]
                            )
                            self.last_git_hash = update["current_hash"]
                            
                            lines = [ln for ln in update["content"].split('\n') if ln.strip()]
                            print("📌 ملخص آخر الأسطر من COORDINATION-LIVE.md:")
                            for line in lines[-8:]:
                                print(f"   {line}")
                            print("-" * 50)
                
                # فحص دوري كل دقيقة (60 ثانية)
                for _ in range(60):
                    if not self.running:
                        break
                    await asyncio.sleep(1)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ استثناء في الحلقة الرئيسية: {e}")
                await asyncio.sleep(10)


def main():
    target_repo = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent.resolve())
    daemon = GitBackedSyncDaemon(target_repo)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    def signal_handler():
        daemon.stop()
        for task in asyncio.all_tasks(loop):
            task.cancel()
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            pass  # Windows fallback
            
    try:
        loop.run_until_complete(daemon.main_loop())
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        daemon.stop()
        loop.close()
        print("✅ تم إنهاء الـ Daemon بأمان.")


if __name__ == "__main__":
    main()
