import asyncio
import base64
import logging
import os
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)


class LocalClaudeRunner:
    """Runs Claude Code locally via subprocess (for when running on bastion)."""

    def __init__(self, workspace: str = "/home/admin"):
        self.workspace = workspace

    async def run_agent(
        self,
        prompt: str,
        on_output: Callable[[str], Awaitable[None]],
        timeout: int = 600,
    ) -> bool:
        """
        Run Claude Code with a prompt using local subprocess.

        Args:
            prompt: The prompt for Claude Code
            on_output: Callback for each line of output
            timeout: Max seconds to wait

        Returns:
            True if successful, False otherwise
        """
        claude_path = "/usr/bin/claude"

        logger.info(f"Running Claude Code locally in {self.workspace}")

        try:
            # Create subprocess with explicit bash and stdin for prompt
            process = await asyncio.create_subprocess_exec(
                "/bin/bash", "-c",
                f'cd {self.workspace} && {claude_path} --dangerously-skip-permissions --print -',
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env={**os.environ, "PYTHONUNBUFFERED": "1", "HOME": self.workspace},
            )

            # Write prompt to stdin and close it
            process.stdin.write(prompt.encode())
            await process.stdin.drain()
            process.stdin.close()
            await process.stdin.wait_closed()

            # Stream output line by line
            async def read_output():
                buffer = ""
                while True:
                    chunk = await process.stdout.read(1024)
                    if not chunk:
                        break
                    buffer += chunk.decode('utf-8', errors='replace')
                    
                    # Process complete lines
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.rstrip('\r')
                        if line:
                            await on_output(line)
                
                # Handle remaining buffer
                if buffer.strip():
                    await on_output(buffer.strip())

            # Run with timeout
            try:
                await asyncio.wait_for(read_output(), timeout=timeout)
            except asyncio.TimeoutError:
                logger.warning(f"Claude Code timed out after {timeout}s")
                process.kill()
                return False

            await process.wait()
            success = process.returncode == 0
            logger.info(f"Claude Code finished with exit code {process.returncode}")
            return success

        except Exception as e:
            logger.exception(f"Error running Claude Code: {e}")
            raise
