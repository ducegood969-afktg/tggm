// Linux has no working 32-bit Wine execution. Use electron-builder's native
// UninstallerReader (also used by its macOS workaround) for engineering builds.
// Production signing always uses the unmodified Windows build path.
const {build}=require('electron-builder');
const {WinPackager}=require('app-builder-lib/out/winPackager');
const {NsisTarget}=require('app-builder-lib/out/targets/nsis/NsisTarget');
const {nsisTemplatesDir,UninstallerReader,AppPackageHelper,CopyElevateHelper}=require('app-builder-lib/out/targets/nsis/nsisUtil');
const fs=require('node:fs/promises');const path=require('node:path');
class NativeNsisTarget extends NsisTarget {
 async computeScriptAndSignUninstaller(defines,commands,installerPath,sharedHeader,archs) {
  if(this.options.script)throw Error('Custom installer scripts are not supported by the engineering build.');
  const script=await fs.readFile(path.join(nsisTemplatesDir,'installer.nsi'),'utf8');
  const uninstallerPath=path.join(this.outDir,`${path.basename(installerPath,'exe')}__uninstaller.exe`);
  defines.BUILD_UNINSTALLER=null;
  defines.UNINSTALLER_OUT_FILE=path.win32.join('Z:',uninstallerPath);
  await this.executeMakensis(defines,commands,sharedHeader+await this.computeFinalScript(script,false,archs));
  await UninstallerReader.exec(installerPath,uninstallerPath);
  delete defines.BUILD_UNINSTALLER;
  defines.UNINSTALLER_OUT_FILE=uninstallerPath;
  return {script,isCustomScript:false};
 }
}
class NativeWinPackager extends WinPackager {
 createTargets(targets,mapper){
  if(targets.some(name=>name!=='nsis'))throw Error('Engineering builder supports only NSIS.');
  const helper=new AppPackageHelper(new CopyElevateHelper());
  mapper('nsis',outDir=>new NativeNsisTarget(this,outDir,'nsis',helper));
 }
}
require('./prepare-git.cjs').prepare().then(()=>build({win:['nsis'],publish:'never',...(process.env.TGG_PREPACKAGED?{prepackaged:process.env.TGG_PREPACKAGED}:{}),
 platformPackagerFactory:info=>new NativeWinPackager(info),
 config:{directories:{output:'dist-preview'},compression:'store',win:{signExecutable:false,forceCodeSigning:false,signtoolOptions:{publisherName:null}}}
})).catch(error=>{console.error(error);process.exitCode=1;});
