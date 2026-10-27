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
            // Optimization: ignore node_modules and .next inside traverse to speed up search
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

async function copyStaticToDist() {
    console.log('Locating built application directories in dist...')
    const distDir = path.join(__dirname, '..', 'dist')
    const appDirs = findAppDirectories(distDir)

    if (appDirs.length === 0) {
        console.warn('⚠️ No unpacked app directories found in dist. Make sure electron-builder finished.')
        return
    }

    const staticSource = path.join(__dirname, '..', '.next', 'static')
    const publicSource = path.join(__dirname, '..', 'public')

    for (const appDir of appDirs) {
        console.log(`Processing application package: ${appDir}`)
        const serverDir = path.join(appDir, '.next', 'standalone')

        // Copy .next/static
        const staticDest = path.join(serverDir, '.next', 'static')
        if (fs.existsSync(staticSource)) {
            console.log(`Copying ${staticSource} to ${staticDest}`)
            await fs.ensureDir(staticDest)
            await fs.copy(staticSource, staticDest)
            console.log('✓ Static files copied')
        }

        // Copy public directory
        const publicDest = path.join(serverDir, 'public')
        if (fs.existsSync(publicSource)) {
            console.log(`Copying ${publicSource} to ${publicDest}`)
            await fs.ensureDir(publicDest)
            await fs.copy(publicSource, publicDest)
            console.log('✓ Public files copied')
        }
    }

    console.log('All static files copied to dist successfully!')
}

copyStaticToDist().catch(console.error)
