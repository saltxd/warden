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
        # Encode prompt to handle special characters
        encoded_prompt = base64.b64encode(prompt.encode()).decode()

        # Build command - decode prompt and pipe to claude
        # Use full path to claude in case PATH isn't set
        claude_path = "/usr/bin/claude"
        command = (
            f'cd {self.workspace} && '
            f'echo "{encoded_prompt}" | base64 -d | '
            f'{claude_path} --dangerously-skip-permissions --print -'
        )

        logger.info(f"Running Claude Code locally in {self.workspace}")

        try:
            # Create subprocess
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env={**os.environ, "PYTHONUNBUFFERED": "1"},
            )

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
