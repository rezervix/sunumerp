const fs = require('fs-extra')
const path = require('path')

async function copyStaticFiles() {
    console.log('Copying static files to standalone...')

    const standaloneDir = path.join(__dirname, '..', '.next', 'standalone')

    if (!fs.existsSync(standaloneDir)) {
        console.error('❌ Standalone directory not found! Make sure next build --standalone finished correctly.')
        return
    }

    // .next/static klasörünü kopyala
    const staticSource = path.join(__dirname, '..', '.next', 'static')
    const staticDest = path.join(standaloneDir, '.next', 'static')

    if (fs.existsSync(staticSource)) {
        console.log(`Copying ${staticSource} to ${staticDest}`)
        await fs.ensureDir(staticDest)
        await fs.copy(staticSource, staticDest)
        console.log('✓ Static files copied')
    } else {
        console.warn('⚠️ Static source not found:', staticSource)
    }

    // public klasörünü kopyala
    const publicSource = path.join(__dirname, '..', 'public')
    const publicDest = path.join(standaloneDir, 'public')

    if (fs.existsSync(publicSource)) {
        console.log(`Copying ${publicSource} to ${publicDest}`)
        await fs.ensureDir(publicDest)
        await fs.copy(publicSource, publicDest)
        console.log('✓ Public files copied')
    } else {
        console.warn('⚠️ Public source not found:', publicSource)
    }

    console.log('All static files copied successfully!')
}

copyStaticFiles().catch(console.error)
