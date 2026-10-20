const {pathToFileURL}=require('node:url');
import(pathToFileURL(process.argv[2]).href).catch(()=>{console.error('TGG Source could not initialize its local workspace.');process.exitCode=1;});
