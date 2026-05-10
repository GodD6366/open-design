"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const SUPPORTED_MODULES = new Set(["top_slider", "user_assets", "banner", "goods", "shop_info", "image_ad"]);
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
async function readJson(filePath) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`${filePath} must contain a JSON object`);
    }
    return parsed;
}
async function writeJson(filePath, value) {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function stringOr(value, fallback = "") {
    const raw = cleanString(value);
    return raw || fallback;
}
function normalizeAspectRatio(value, fallback) {
    const raw = cleanString(value);
    return raw || fallback;
}
function sizeForAspectRatio(aspectRatio, moduleType) {
    const normalized = aspectRatio.replace(/\s+/g, "");
    if (normalized === "9:16")
        return "1008x1792";
    if (normalized === "3:4")
        return "1008x1344";
    if (normalized === "16:9")
        return "1792x1008";
    if (normalized === "4:3")
        return "1344x1008";
    if (normalized === "1:1")
        return "1024x1024";
    if (normalized === "75:30")
        return "1792x1008";
    if (moduleType === "banner")
        return "1792x1008";
    if (moduleType === "shop_info")
        return "1008x1792";
    if (moduleType === "top_slider")
        return "1008x1344";
    if (moduleType === "goods")
        return "1344x1008";
    return "1024x1024";
}
function defaultAspectRatio(moduleType) {
    if (moduleType === "top_slider")
        return "3:4";
    if (moduleType === "banner")
        return "75:30";
    if (moduleType === "goods")
        return "4:3";
    if (moduleType === "shop_info")
        return "9:16";
    return "1:1";
}
function normalizePromptPayload(value) {
    if (typeof value === "string") {
        const raw = value.trim();
        return raw ? raw : "";
    }
    if (value && typeof value === "object") {
        return JSON.stringify(value);
    }
    return "";
}
async function readOptionalJson(filePath) {
    try {
        return await readJson(filePath);
    }
    catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            return null;
        }
        throw error;
    }
}
async function readStyleGuide(rootDir) {
    return ((await readOptionalJson(path.join(rootDir, "shop-home-page.style-guide.json"))) ??
        (await readOptionalJson(path.join(rootDir, "style-guide.json"))));
}
async function resolveSchemaHelpers(rootDir) {
    const scriptDir = __dirname;
    const candidates = [
        "@open-design/contracts/shop-home-page-schema",
        "@open-design/contracts",
        path.resolve(scriptDir, "../../../packages/contracts/dist/shop-home-page-schema.js"),
        path.resolve(rootDir, "../../packages/contracts/dist/shop-home-page-schema.js"),
        path.resolve(process.cwd(), "packages/contracts/dist/shop-home-page-schema.js"),
    ];
    const errors = [];
    for (const candidate of candidates) {
        try {
            const loaded = (await import(candidate));
            if (typeof loaded.normalizeShopHomePageSchema === "function") {
                return loaded;
            }
        }
        catch (error) {
            errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    throw new Error([
        "Unable to load @open-design/contracts/shop-home-page-schema.",
        "Run from the open-design repo or build/install @open-design/contracts before normalizing schema.",
        ...errors.map((line) => `- ${line}`),
    ].join("\n"));
}
async function resolvePromptHelpers(rootDir) {
    const scriptDir = __dirname;
    const candidates = [
        "@open-design/contracts/shop-home-page-image-prompts",
        "@open-design/contracts",
        path.resolve(scriptDir, "../../../packages/contracts/dist/prompts/shop-home-page-image-prompts.js"),
        path.resolve(rootDir, "../../packages/contracts/dist/prompts/shop-home-page-image-prompts.js"),
        path.resolve(process.cwd(), "packages/contracts/dist/prompts/shop-home-page-image-prompts.js"),
    ];
    const errors = [];
    for (const candidate of candidates) {
        try {
            const loaded = (await import(candidate));
            if (typeof loaded.buildShopHomePageImagePrompt === "function" &&
                typeof loaded.buildShopHomePageUserAssetsEntryPrompt === "function") {
                return loaded;
            }
        }
        catch (error) {
            errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    throw new Error([
        "Unable to load @open-design/contracts/shop-home-page-image-prompts.",
        "Run from the open-design repo or build/install @open-design/contracts before generating image requests.",
        ...errors.map((line) => `- ${line}`),
    ].join("\n"));
}
async function normalizeSchemaFile(rootDir, schemaPath, schema, requirements, styleGuide) {
    const schemaHelpers = await resolveSchemaHelpers(rootDir);
    const normalized = schemaHelpers.normalizeShopHomePageSchema(schema, requirements, styleGuide);
    await writeJson(schemaPath, normalized);
    return normalized;
}
function inferUserAssetsTemplateType(count) {
    if (count <= 1)
        return 7;
    if (count === 2)
        return 1;
    if (count === 3)
        return 3;
    if (count === 4)
        return 6;
    if (count === 5)
        return 5;
    return "hotzone";
}
function resolveUserAssetsCardLayout(data) {
    const explicit = asObject(data.card_layout);
    if (asArray(explicit.slots).length > 0)
        return explicit;
    const legacy = asObject(data.layout);
    const entries = asArray(data.entries).map(asObject);
    const templateType = legacy.template_type ?? inferUserAssetsTemplateType(entries.length);
    const existingSlots = asArray(legacy.slots).map(asObject);
    if (existingSlots.length > 0) {
        return {
            template_type: templateType,
            slots: existingSlots,
        };
    }
    if (templateType === 2) {
        return {
            template_type: 2,
            slots: [
                { id: "left_large", role: "primary_action", size: "large", position: "left" },
                { id: "right_top", role: "secondary_action", size: "small", position: "right_top" },
                { id: "right_bottom", role: "secondary_action", size: "small", position: "right_bottom" },
            ],
        };
    }
    const slotCount = Math.max(entries.length, 1);
    return {
        template_type: templateType,
        slots: Array.from({ length: slotCount }, (_, index) => ({
            id: `slot_${index + 1}`,
            role: index === 0 ? "primary_action" : "secondary_action",
            size: templateType === "hotzone" ? "free" : "card",
            position: `slot_${index + 1}`,
        })),
    };
}
function slotForEntry(entry, cardLayout, index) {
    const slots = asArray(cardLayout.slots).map(asObject);
    const slotId = stringOr(entry.slot_id || entry.id, `slot_${index + 1}`);
    return slots.find((slot) => stringOr(slot.id) === slotId) ?? slots[index] ?? { id: slotId };
}
function legacyPromptFrom(value, fallback, targetId) {
    const prompt = cleanString(value.image_prompt) || cleanString(fallback.image_prompt);
    if (!prompt)
        return "";
    process.stderr.write(`# ${targetId}: image_prompt is legacy fallback because image_prompt_schema is missing\n`);
    return prompt;
}
function modulePromptSchema(value, fallback) {
    const own = value.image_prompt_schema;
    if (own && typeof own === "object" && !Array.isArray(own))
        return asObject(own);
    const inherited = fallback.image_prompt_schema;
    if (inherited && typeof inherited === "object" && !Array.isArray(inherited))
        return asObject(inherited);
    return null;
}
function addSequentialDerivedReference(targets, target, firstTargetId, enabled) {
    if (enabled && firstTargetId && firstTargetId !== target.id) {
        target.derivedReferences = [{ type: "previous-output", previous_request_id: firstTargetId }];
    }
    targets.push(target);
}
function sanitizeFileStem(value) {
    return value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "image";
}
function generatedImageRelativePath(requestId) {
    return path.join("generated-images", `${sanitizeFileStem(requestId)}.png`).split(path.sep).join("/");
}
function requestItemFromTarget(target, url) {
    return {
        id: target.id,
        module_id: target.moduleId,
        module_type: target.moduleType,
        target_id: target.targetId,
        target_kind: target.targetKind,
        aspect_ratio: target.aspectRatio,
        size: target.size,
        prompt: target.prompt,
        files: target.files,
        backup_file: generatedImageRelativePath(target.id),
        ...(target.derivedReferences ? { derived_references: target.derivedReferences } : {}),
        status: url ? "done" : "pending",
        url,
    };
}
function collectReferenceFiles(rootDir, ...values) {
    const files = [];
    for (const value of values) {
        for (const item of asArray(value)) {
            const raw = cleanString(item);
            if (!raw)
                continue;
            if (/^https?:\/\//i.test(raw))
                continue;
            files.push(path.resolve(rootDir, raw));
        }
    }
    return Array.from(new Set(files));
}
async function existingFiles(files) {
    const out = [];
    for (const file of files) {
        try {
            const stat = await fs.stat(file);
            if (stat.isFile())
                out.push(file);
        }
        catch {
            // Missing reference files are ignored so a text-only prompt can still run.
        }
    }
    return out;
}
async function collectTargets(rootDir, schema, styleGuide, promptHelpers) {
    const modules = asArray(schema.modules);
    const targets = [];
    for (const moduleValue of modules) {
        const module = asObject(moduleValue);
        const moduleType = cleanString(module.type);
        const moduleId = cleanString(module.id);
        if (!SUPPORTED_MODULES.has(moduleType) || !moduleId)
            continue;
        const data = asObject(module.data);
        const moduleRefs = module.reference_images;
        if (moduleType === "user_assets") {
            const cardLayout = resolveUserAssetsCardLayout(data);
            const fixedLayout = cardLayout.template_type !== "hotzone";
            let firstRequestId = null;
            for (const [entryIndex, entryValue] of asArray(data.entries).entries()) {
                const entry = asObject(entryValue);
                const targetId = cleanString(entry.id);
                if (!targetId)
                    continue;
                const entryPromptSchema = modulePromptSchema(entry, module);
                const slot = slotForEntry(entry, cardLayout, entryIndex);
                const prompt = entryPromptSchema
                    ? normalizePromptPayload(promptHelpers.buildShopHomePageUserAssetsEntryPrompt({
                        entry,
                        slot,
                        cardLayout,
                        styleGuide,
                    }))
                    : legacyPromptFrom(entry, module, `${moduleId}.entries.${targetId}`);
                const aspectRatio = normalizeAspectRatio(entry.aspect_ratio, "1:1");
                const target = {
                    id: `${moduleId}.entries.${targetId}`,
                    moduleId,
                    moduleType,
                    targetId,
                    targetKind: "entries",
                    prompt,
                    aspectRatio,
                    size: sizeForAspectRatio(aspectRatio, moduleType),
                    files: await existingFiles(collectReferenceFiles(rootDir, moduleRefs, entry.reference_images)),
                };
                if (!firstRequestId)
                    firstRequestId = target.id;
                addSequentialDerivedReference(targets, target, firstRequestId, fixedLayout && entryIndex >= 1);
            }
            continue;
        }
        let firstGoodsRequestId = null;
        for (const [itemIndex, itemValue] of asArray(data.items).entries()) {
            const item = asObject(itemValue);
            const targetId = cleanString(item.id);
            if (!targetId)
                continue;
            const itemPromptSchema = modulePromptSchema(item, module);
            const prompt = itemPromptSchema
                ? normalizePromptPayload(promptHelpers.buildShopHomePageImagePrompt({
                    moduleType,
                    item,
                    styleGuide,
                }))
                : legacyPromptFrom(item, module, `${moduleId}.items.${targetId}`);
            const aspectRatio = normalizeAspectRatio(item.aspect_ratio, defaultAspectRatio(moduleType));
            const target = {
                id: `${moduleId}.items.${targetId}`,
                moduleId,
                moduleType,
                targetId,
                targetKind: "items",
                prompt,
                aspectRatio,
                size: sizeForAspectRatio(aspectRatio, moduleType),
                files: await existingFiles(collectReferenceFiles(rootDir, moduleRefs, item.reference_images)),
            };
            if (moduleType === "goods") {
                if (!firstGoodsRequestId)
                    firstGoodsRequestId = target.id;
                addSequentialDerivedReference(targets, target, firstGoodsRequestId, itemIndex >= 1);
            }
            else {
                targets.push(target);
            }
        }
    }
    return targets;
}
async function main() {
    const { positional, options } = parseArgs(process.argv.slice(2));
    const rootDir = path.resolve(positional[0] ?? ".");
    const schemaPath = path.join(rootDir, "schema.json");
    const manifestPath = path.join(rootDir, "assets-manifest.json");
    const requestsPath = path.join(rootDir, "image-requests.json");
    const rawSchema = await readJson(schemaPath);
    const requirements = await readJson(path.join(rootDir, "requirements.json"));
    const styleGuide = await readStyleGuide(rootDir);
    const schema = await normalizeSchemaFile(rootDir, schemaPath, rawSchema, requirements, styleGuide);
    const promptHelpers = await resolvePromptHelpers(rootDir);
    const targets = await collectTargets(rootDir, schema, styleGuide, promptHelpers);
    const force = hasFlag(options, "force");
    let manifest = {
        version: "1.0.0",
        generator: "generate-image-assets.cjs",
        generated_at: new Date().toISOString(),
        items: {},
    };
    try {
        manifest = { ...manifest, ...(await readJson(manifestPath)) };
    }
    catch {
        // A missing manifest is expected on the first run.
    }
    const previousItems = asObject(manifest.items);
    const items = {};
    const requestItems = [];
    for (const target of targets) {
        if (!target.prompt) {
            throw new Error(`missing image_prompt_schema (or legacy image_prompt fallback) for ${target.id}`);
        }
        const previous = asObject(previousItems[target.id]);
        const url = force ? "" : cleanString(previous.url);
        items[target.id] = {
            module_id: target.moduleId,
            module_type: target.moduleType,
            target_id: target.targetId,
            target_kind: target.targetKind,
            aspect_ratio: target.aspectRatio,
            size: target.size,
            prompt: target.prompt,
            files: target.files,
            backup_file: generatedImageRelativePath(target.id),
            ...(target.derivedReferences ? { derived_references: target.derivedReferences } : {}),
            url,
        };
        requestItems.push(requestItemFromTarget(target, url));
    }
    manifest.items = items;
    manifest.generator = "generate-image-assets.cjs";
    manifest.generated_at = new Date().toISOString();
    await writeJson(manifestPath, manifest);
    await writeJson(requestsPath, {
        version: "1.0.0",
        generator: "generate-image-assets.cjs",
        generated_at: new Date().toISOString(),
        instructions: "Run generate-image-assets.cjs for every pending item. It tries the global youzan-image Skill first, then falls back to built-in OpenAI image generation plus youzan-oss upload, and records the final CDN URL.",
        items: requestItems,
    });
    process.stdout.write(`${JSON.stringify({
        ok: true,
        targets: targets.length,
        pending: requestItems.filter((item) => item.status === "pending").length,
        requests: requestsPath,
        manifest: manifestPath,
    }, null, 2)}\n`);
}
main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
