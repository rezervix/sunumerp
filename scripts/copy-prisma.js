const fs = require('fs-extra')
const path = require('path')

// Recursively search for 'resources/app' directories in 'dist/' to support cross-platform builds
function findAppDirectories(distDir) {
    const appDirs = [];
    if (!fs.existsSync(distDir)) return appDirs;

    function traverse(currentDir) {
        let files;
        try {
            files = fs.readdirSync(currentDir);
        } catch (e) {
            return;
        }
        for (const file of files) {
            if (file === 'node_modules' || file === '.next') continue;
            const fullPath = path.join(currentDir, file);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch (e) {
                continue;
            }
            if (stat.isDirectory()) {
                if (file === 'app' && path.basename(currentDir) === 'resources') {
                    appDirs.push(fullPath);
                } else {
                    traverse(fullPath);
                }
            }
        }
    }

    traverse(distDir);
    return appDirs;
}

async function copyPrismaClient() {
    console.log('Locating built application directories in dist for Prisma...')
    const distDir = path.join(__dirname, '..', 'dist')
    const appDirs = findAppDirectories(distDir)

    if (appDirs.length === 0) {
        console.warn('⚠️ No unpacked app directories found in dist. Make sure electron-builder finished.')
        return
    }

    const source = path.join(__dirname, '..', 'node_modules', '.prisma')

    if (!fs.existsSync(source)) {
        console.error('❌ Prisma Client source not found!')
        return
    }

    for (const appDir of appDirs) {
        console.log(`Processing application package: ${appDir}`)
        const dest = path.join(appDir, 'node_modules', '.prisma')
        const standaloneDest = path.join(appDir, '.next', 'standalone', 'node_modules', '.prisma')

        console.log(`Copying Prisma client to ${dest}`)
        await fs.ensureDir(path.dirname(dest))
        await fs.copy(source, dest)

        console.log(`Copying Prisma client to standalone: ${standaloneDest}`)
        await fs.ensureDir(path.dirname(standaloneDest))
        await fs.copy(source, standaloneDest)
        console.log('✓ Prisma Client copied successfully!')
    }
}

copyPrismaClient().catch(console.error)
