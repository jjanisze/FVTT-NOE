import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const moduleRoot = path.join(__dirname, '..', '..');

const configPath = path.join(__dirname, process.argv[2] ?? 'pipeline.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Viewer: Store states
const report = {
    version: config.version,
    capabilities: config.capabilities,
    results: []
};

console.log(`\n=== Audio Pipeline v${config.version} ===\nCapabilities: ${config.capabilities.join(', ')}\n`);

for (const sound of config.sounds) {
    console.log(`Processing: ${sound.name}`);
    const outPath = path.resolve(__dirname, sound.outputFilePath);
    const tempFile = path.join(__dirname, `temp_${sound.name}.ogg`);
    const params = sound.parameters || {};

    let state = 'Starting';
    let error = null;

    try {
        // 1. Download
        state = 'Downloading';
        console.log(`  Downloading ${sound.sourceUrl}...`);
        execSync(`curl -sL -A "AudioPipeline/1.0" "${sound.sourceUrl}" -o "${tempFile}"`);

        // 2. Build FFmpeg command
        state = 'Processing';
        console.log(`  Applying normalization and processing...`);
        let ffmpegCmd = `ffmpeg -i "${tempFile}" -y -v warning`;

        if (params.trimDuration) {
            const start = params.trimStart || 0;
            ffmpegCmd += ` -ss ${start} -t ${params.trimDuration}`;
        }

        const lufs = params.lufs || -18;
        const lra = params.lra || 11;
        const tp = params.tp || -1.5;
        ffmpegCmd += ` -af loudnorm=I=${lufs}:LRA=${lra}:TP=${tp}`;

        ffmpegCmd += ` -c:a libvorbis -q:a 5 "${outPath}"`;

        execSync(ffmpegCmd);
        state = 'Success';
    } catch (err) {
        state = 'Failed';
        error = err.message;
        console.error(`  Error: ${err.message}`);
    } finally {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }

    report.results.push({
        name: sound.name,
        state,
        arguments: params,
        returns: fs.existsSync(outPath) ? outPath : null,
        error: error
    });
}

// Viewer: Print Report
console.log('\n=== Pipeline Report Viewer ===\n');
console.table(report.results.map(r => ({
    Name: r.name,
    State: r.state,
    Arguments: JSON.stringify(r.arguments),
    Returns: r.returns ? path.basename(r.returns) : 'N/A'
})));
