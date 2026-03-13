const fs = require('fs-extra')
const path = require('path')

function getResourcesDir(context) {
  if (context.electronPlatformName === 'darwin') {
    return path.join(context.appOutDir, 'Contents', 'Resources')
  }

  return path.join(context.appOutDir, 'resources')
}

module.exports = async function afterPack(context) {
  if (process.env.CLAWFAST_BUNDLE_OPENCLAW !== '1') {
    return
  }

  const sourceNodeModulesDir = path.join(context.packager.projectDir, 'build', 'openclaw', 'node_modules')
  const targetNodeModulesDir = path.join(getResourcesDir(context), 'openclaw', 'node_modules')

  if (!(await fs.pathExists(sourceNodeModulesDir))) {
    return
  }

  await fs.ensureDir(path.dirname(targetNodeModulesDir))
  await fs.copy(sourceNodeModulesDir, targetNodeModulesDir, {
    dereference: true,
  })

  console.log(`[after-pack] copied bundled openclaw node_modules -> ${targetNodeModulesDir}`)
}
