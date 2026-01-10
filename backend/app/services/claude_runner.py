import base64
import logging
from typing import Callable, Awaitable
from .ssh_service import SSHService

logger = logging.getLogger(__name__)


class ClaudeCodeRunner:
    """Runs Claude Code on remote build server."""

    def __init__(self, ssh: SSHService):
        self.ssh = ssh

    async def setup_workspace(self, workspace: str) -> bool:
        """Create workspace directory."""
        stdout, stderr, code = await self.ssh.run(f"mkdir -p {workspace}")
        return code == 0

    async def run_agent(
        self,
        workspace: str,
        prompt: str,
        on_output: Callable[[str], Awaitable[None]],
        timeout: int = 600,
    ) -> bool:
        """
        Run Claude Code with a prompt.

        Args:
            workspace: Directory to run in
            prompt: The prompt for Claude Code
            on_output: Callback for each line of output
            timeout: Max seconds to wait

        Returns:
            True if successful, False otherwise
        """
        # Escape prompt for shell - use base64 to handle complex prompts
        encoded_prompt = base64.b64encode(prompt.encode()).decode()

        # Build command that decodes and pipes to claude
        # Using --print to get output and --dangerously-skip-permissions for automation
        # Use stdbuf to disable output buffering for real-time streaming
        # Also set PYTHONUNBUFFERED=1 for any Python scripts Claude might run
        command = (
            f"export PYTHONUNBUFFERED=1; "
            f"cd {workspace} && "
            f"stdbuf -oL -eL claude --dangerously-skip-permissions --print "
            f'"$(echo {encoded_prompt} | base64 -d)"'
        )

        logger.info(f"Running Claude Code in {workspace}")

        exit_code = await self.ssh.run_streaming(
            command=command,
            on_stdout=on_output,
            on_stderr=on_output,  # Also capture stderr
            timeout=timeout,
        )

        success = exit_code == 0
        logger.info(f"Claude Code finished with exit code {exit_code}")

        return success

    async def list_files(self, workspace: str) -> list[str]:
        """List files created in workspace."""
        stdout, _, code = await self.ssh.run(
            f"find {workspace} -type f \\( -name '*.py' -o -name '*.ts' -o -name '*.tsx' -o -name '*.json' -o -name '*.md' -o -name '*.yml' -o -name '*.yaml' -o -name 'Dockerfile*' \\) 2>/dev/null | head -50",
            timeout=30,
        )
        if code == 0:
            return [f for f in stdout.strip().split("\n") if f]
        return []

    async def get_file_content(self, filepath: str) -> str | None:
        """Get content of a specific file."""
        stdout, _, code = await self.ssh.run(f"cat {filepath}", timeout=10)
        if code == 0:
            return stdout
        return None
