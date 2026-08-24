import { spawn } from "node:child_process";

const deviceArg = process.argv.find((arg) => arg.startsWith("--device="));
const device = deviceArg?.split("=")[1] === "mobile" ? "mobile" : "desktop";
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(args, env = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			env: { ...process.env, ...env },
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		child.on("error", reject);
		child.on("exit", (code, signal) => {
			if (signal) reject(new Error("Command terminated by " + signal));
			else if (code === 0) resolve();
			else reject(new Error("Command exited with code " + code));
		});
	});
}

try {
	await run(["build"]);
	await run(["exec", "lhci", "autorun", "--config=lighthouserc.cjs"], {
		LH_DEVICE: device,
	});
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
} finally {
	await run(["astro", "preview", "stop"]).catch(() => undefined);
}
