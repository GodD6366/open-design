"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

function parseArgs(argv) {
    const args = { positional: [], options: new Map() };
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith("--")) {
            args.positional.push(token);
            continue;
        }
        const eq = token.indexOf("=");
        const key = eq >= 0 ? token.slice(2, eq) : token.slice(2);
        const value = eq >= 0
            ? token.slice(eq + 1)
            : index + 1 < argv.length && !argv[index + 1].startsWith("--")
                ? argv[++index]
                : "true";
        const list = args.options.get(key) ?? [];
        list.push(value);
        args.options.set(key, list);
    }
    return args;
}

function hasFlag(options, key) {
    return options.has(key);
}

function optionValue(options, key) {
    const values = options.get(key);
    return values && values.length > 0 ? String(values[values.length - 1]).trim() : "";
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function localDateParts(date = new Date()) {
    return {
        date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
        time: `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`,
    };
}

function sanitizeSlug(value) {
    return String(value || "")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}

async function readJsonIfExists(filePath) {
    try {
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}

async function isProjectDir(dirPath) {
    return (await exists(path.join(dirPath, "requirements.json"))) ||
        (await exists(path.join(dirPath, "schema.json"))) ||
        (await exists(path.join(dirPath, "dist", "shop-home-page.preview.html")));
}

async function collectProjectDirs(baseDir) {
    const projects = [];
    let dateEntries = [];
    try {
        dateEntries = await fs.readdir(baseDir, { withFileTypes: true });
    }
    catch (error) {
        if (error && typeof error === "object" && error.code === "ENOENT")
            return projects;
        throw error;
    }
    for (const dateEntry of dateEntries) {
        if (!dateEntry.isDirectory())
            continue;
        const dateDir = path.join(baseDir, dateEntry.name);
        let runEntries = [];
        try {
            runEntries = await fs.readdir(dateDir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const runEntry of runEntries) {
            if (!runEntry.isDirectory())
                continue;
            const dir = path.join(dateDir, runEntry.name);
            if (!(await isProjectDir(dir)))
                continue;
            const stat = await fs.stat(dir);
            const requirements = await readJsonIfExists(path.join(dir, "requirements.json"));
            projects.push({
                dir,
                relative_dir: path.relative(baseDir, dir).split(path.sep).join("/"),
                date: dateEntry.name,
                name: runEntry.name,
                shop_name: typeof requirements?.shop_name === "string" ? requirements.shop_name : "",
                updated_at: stat.mtime.toISOString(),
            });
        }
    }
    projects.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
    return projects;
}

async function uniqueRunDir(dateDir, timePart, slug) {
    const stem = slug ? `${timePart}-${slug}` : timePart;
    let candidate = path.join(dateDir, stem);
    let index = 2;
    while (await exists(candidate)) {
        candidate = path.join(dateDir, `${stem}-${index}`);
        index += 1;
    }
    return candidate;
}

async function main() {
    const { positional, options } = parseArgs(process.argv.slice(2));
    const scriptDir = __dirname;
    const skillDir = path.resolve(scriptDir, "..");
    const baseDir = path.resolve(optionValue(options, "base-dir") || path.join(skillDir, ".dist"));
    const shopName = optionValue(options, "shop-name");
    const forceNew = hasFlag(options, "new") || hasFlag(options, "force-new");
    const reuseLatest = hasFlag(options, "reuse-latest");
    const explicitOutputDir = optionValue(options, "output-dir") || positional[0] || "";
    const history = await collectProjectDirs(baseDir);
    if (explicitOutputDir) {
        const outputDir = path.resolve(explicitOutputDir);
        await fs.mkdir(outputDir, { recursive: true });
        process.stdout.write(`${JSON.stringify({
            ok: true,
            action: "use_explicit",
            output_dir: outputDir,
            base_dir: baseDir,
            history_count: history.length,
            latest_project: history[0] || null,
            needs_confirm: false,
        }, null, 2)}\n`);
        return;
    }
    if (reuseLatest) {
        if (history.length === 0) {
            process.stdout.write(`${JSON.stringify({
                ok: false,
                action: "reuse_latest",
                base_dir: baseDir,
                history_count: 0,
                latest_project: null,
                needs_confirm: true,
                message: "No historical project exists. Ask whether to create a new project.",
            }, null, 2)}\n`);
            process.exitCode = 2;
            return;
        }
        process.stdout.write(`${JSON.stringify({
            ok: true,
            action: "reuse_latest",
            output_dir: history[0].dir,
            base_dir: baseDir,
            history_count: history.length,
            latest_project: history[0],
            needs_confirm: false,
        }, null, 2)}\n`);
        return;
    }
    if (history.length > 0 && !forceNew) {
        process.stdout.write(`${JSON.stringify({
            ok: false,
            action: "confirm_required",
            base_dir: baseDir,
            history_count: history.length,
            latest_project: history[0],
            needs_confirm: true,
            message: "Historical Skill project exists. Ask the user whether to regenerate a new project or continue the latest one.",
        }, null, 2)}\n`);
        process.exitCode = 2;
        return;
    }
    const { date, time } = localDateParts();
    const dateDir = path.join(baseDir, date);
    await fs.mkdir(dateDir, { recursive: true });
    const outputDir = await uniqueRunDir(dateDir, time, sanitizeSlug(shopName));
    await fs.mkdir(outputDir, { recursive: true });
    process.stdout.write(`${JSON.stringify({
        ok: true,
        action: "create_new",
        output_dir: outputDir,
        base_dir: baseDir,
        history_count: history.length,
        latest_project: history[0] || null,
        needs_confirm: false,
    }, null, 2)}\n`);
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exit(1);
});
