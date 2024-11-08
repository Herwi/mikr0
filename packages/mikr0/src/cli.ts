#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import FormData from "form-data";
import prompts from "prompts";
import undici from "undici";
import { build, getEntryPoint } from "./vite/build.js";
import { runServer } from "./vite/viteDev.js";

let {
	positionals: [command],
	values: { registry, username, password, folder },
} = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: {
		registry: {
			type: "string",
			alias: "r",
			description: "Registry URL",
		},
		username: {
			type: "string",
			alias: "u",
			description: "Username to authenticate with",
		},
		password: {
			type: "string",
			alias: "p",
			description: "Password to authenticate with",
		},
		folder: {
			type: "string",
			alias: "f",
			description: "Skip the build and specify the folder to publish",
		},
	},
});

const { absolute: entry } = getEntryPoint();

(async () => {
	if (command === "build") {
		await build({ entry });
		return;
	}

	if (command === "publish") {
		if (!registry) exit("Missing --registry");
		if (!username || !password) {
			const result = await prompts([
				{
					type: username ? null : "text",
					name: "username",
					message: "Username",
				},
				{
					type: password ? null : "password",
					name: "password",
					message: "Password",
				},
			]);
			username ??= result.username;
			password ??= result.password;
		}
		if (!password) exit("Missing --password");

		if (!folder) {
			await build({ entry });
		}
		await sendFolderToServer({
			distPath: folder ?? "./dist",
			serverUrl: registry,
			username: username!,
			password: password!,
		});
		return;
	}

	if (command === "dev") {
		runServer();
		return;
	}

	console.log("Usage: mikr0 <command> [options]");
})();

function exit(msg: string): never {
	console.error(msg);
	process.exit(1);
}

export async function sendFolderToServer({
	distPath,
	password,
	serverUrl,
	username,
}: {
	distPath: string;
	serverUrl: string;
	username: string;
	password: string;
}) {
	fs.existsSync(distPath) || exit(`Folder ${distPath} does not exist`);
	const form = new FormData();
	const zipPath = path.join(distPath, "package.zip");
	const pkg = JSON.parse(
		await fsp.readFile(path.join(distPath, "package.json"), "utf-8"),
	);
	const sanitizedUrl = new URL(serverUrl).href.replace(/\/$/, "");

	form.append("zip", fs.createReadStream(zipPath));
	form.append("package", JSON.stringify(pkg), {
		contentType: "application/json",
		filename: "package.json",
	});

	try {
		await undici.request(
			`${sanitizedUrl}/r/publish/${pkg.name}/${pkg.version}`,
			{
				method: "POST",
				headers: {
					...form.getHeaders(),
					Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
				},
				body: form,
				throwOnError: true,
			},
		);
	} catch (error) {
		console.error("Error uploading files:", error);
	}
}
