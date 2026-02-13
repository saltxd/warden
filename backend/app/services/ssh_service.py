import asyncssh
import asyncio
from typing import Callable, Optional, Awaitable
import logging

from ..config import settings

logger = logging.getLogger(__name__)


class SSHService:
    """Manages SSH connections to build server."""

    def __init__(
        self,
        host: str,
        username: str,
        port: int = 22,
    ):
        self.host = host
        self.username = username
        self.port = port
        self._conn: Optional[asyncssh.SSHClientConnection] = None

    def _get_known_hosts(self):
        """Get known_hosts configuration."""
        known_hosts_path = settings.SSH_KNOWN_HOSTS_PATH
        if known_hosts_path:
            try:
                return asyncssh.read_known_hosts(known_hosts_path)
            except Exception:
                logger.warning(f"Could not read known_hosts from {known_hosts_path}, accepting all keys")
        return None

    async def connect(self) -> "SSHService":
        """Establish SSH connection."""
        logger.info(f"Connecting to {self.username}@{self.host}...")
        try:
            self._conn = await asyncssh.connect(
                self.host,
                port=self.port,
                username=self.username,
                known_hosts=self._get_known_hosts(),
            )
            logger.info(f"Connected to {self.host}")
            return self
        except Exception as e:
            logger.error(f"SSH connection failed: {e}")
            raise

    async def disconnect(self):
        """Close SSH connection."""
        if self._conn:
            self._conn.close()
            await self._conn.wait_closed()
            logger.info(f"Disconnected from {self.host}")

    async def run(self, command: str, timeout: int = 30) -> tuple[str, str, int]:
        """Run command and return (stdout, stderr, exit_code)."""
        if not self._conn:
            await self.connect()

        try:
            result = await asyncio.wait_for(self._conn.run(command), timeout=timeout)
            return result.stdout, result.stderr, result.exit_status
        except asyncio.TimeoutError:
            logger.error(f"Command timed out after {timeout}s: {command[:80]}...")
            raise

    async def run_streaming(
        self,
        command: str,
        on_stdout: Callable[[str], Awaitable[None]],
        on_stderr: Optional[Callable[[str], Awaitable[None]]] = None,
        timeout: int = 600,  # 10 minutes default for Claude Code
    ) -> int:
        """Run command and stream output line by line in real-time."""
        if not self._conn:
            await self.connect()

        try:
            # Use request_pty to get unbuffered output (terminal mode)
            process = await self._conn.create_process(
                command,
                term_type="xterm",
            )

            async def read_output():
                """Read stdout line by line as it arrives."""
                buffer = ""
                async for chunk in process.stdout:
                    buffer += chunk
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.rstrip("\r")
                        if line:
                            await on_stdout(line)
                if buffer.strip():
                    await on_stdout(buffer.strip())

            async def read_stderr():
                """Read stderr if callback provided."""
                if not on_stderr:
                    return
                buffer = ""
                async for chunk in process.stderr:
                    buffer += chunk
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.rstrip("\r")
                        if line:
                            await on_stderr(line)
                if buffer.strip():
                    await on_stderr(buffer.strip())

            try:
                await asyncio.wait_for(
                    asyncio.gather(read_output(), read_stderr()),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                logger.warning(f"Stream reading timed out after {timeout}s, terminating process")
                process.terminate()
                # Give process a moment to clean up, then force kill
                try:
                    await asyncio.wait_for(process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    process.kill()

            await process.wait()
            return process.exit_status or 0

        except asyncio.TimeoutError:
            logger.error(f"Streaming command timed out after {timeout}s")
            return -1
        except Exception as e:
            logger.error(f"Error during streaming: {e}")
            raise

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()
