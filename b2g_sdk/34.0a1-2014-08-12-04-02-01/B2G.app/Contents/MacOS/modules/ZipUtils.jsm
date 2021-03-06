this.EXPORTED_SYMBOLS=["ZipUtils"];const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;const Cu=Components.utils;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyModuleGetter(this,"FileUtils","resource://gre/modules/FileUtils.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Promise","resource://gre/modules/Promise.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Task","resource://gre/modules/Task.jsm");const EXTRACTION_BUFFER=1024*512;function saveStreamAsync(aPath,aStream,aFile){let deferred=Promise.defer(); let sts=Cc["@mozilla.org/network/stream-transport-service;1"].getService(Ci.nsIStreamTransportService);let transport=sts.createInputTransport(aStream,-1,-1,true);let input=transport.openInputStream(0,0,0).QueryInterface(Ci.nsIAsyncInputStream);let source=Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);source.setInputStream(input);let data=new Uint8Array(EXTRACTION_BUFFER);function readFailed(error){try{aStream.close();}
catch(e){logger.error("Failed to close JAR stream for "+aPath);}
aFile.close().then(function(){deferred.reject(error);},function(e){logger.error("Failed to close file for "+aPath);deferred.reject(error);});}
function readData(){try{let count=Math.min(source.available(),data.byteLength);source.readArrayBuffer(count,data.buffer);aFile.write(data,{bytes:count}).then(function(){input.asyncWait(readData,0,0,Services.tm.currentThread);},readFailed);}
catch(e if e.result==Cr.NS_BASE_STREAM_CLOSED){deferred.resolve(aFile.close());}
catch(e){readFailed(e);}}
input.asyncWait(readData,0,0,Services.tm.currentThread);return deferred.promise;}
this.ZipUtils={extractFilesAsync:function ZipUtils_extractFilesAsync(aZipFile,aDir){let zipReader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);try{zipReader.open(aZipFile);}
catch(e){return Promise.reject(e);}
return Task.spawn(function(){
 let entries=zipReader.findEntries(null);let names=[];while(entries.hasMore())
names.push(entries.getNext());names.sort();for(let name of names){let entryName=name;let zipentry=zipReader.getEntry(name);let path=OS.Path.join(aDir.path,...name.split("/"));if(zipentry.isDirectory){try{yield OS.File.makeDir(path);}
catch(e){dump("extractFilesAsync: failed to create directory "+path+"\n");throw e;}}
else{let options={unixMode:zipentry.permissions|FileUtils.PERMS_FILE};try{let file=yield OS.File.open(path,{truncate:true},options);if(zipentry.realSize==0)
yield file.close();else
yield saveStreamAsync(path,zipReader.getInputStream(entryName),file);}
catch(e){dump("extractFilesAsync: failed to extract file "+path+"\n");throw e;}}}
zipReader.close();}).then(null,(e)=>{zipReader.close();throw e;});},extractFiles:function ZipUtils_extractFiles(aZipFile,aDir){function getTargetFile(aDir,entry){let target=aDir.clone();entry.split("/").forEach(function(aPart){target.append(aPart);});return target;}
let zipReader=Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);zipReader.open(aZipFile);try{ let entries=zipReader.findEntries("*/");while(entries.hasMore()){let entryName=entries.getNext();let target=getTargetFile(aDir,entryName);if(!target.exists()){try{target.create(Ci.nsIFile.DIRECTORY_TYPE,FileUtils.PERMS_DIRECTORY);}
catch(e){dump("extractFiles: failed to create target directory for extraction file = "+target.path+"\n");}}}
entries=zipReader.findEntries(null);while(entries.hasMore()){let entryName=entries.getNext();let target=getTargetFile(aDir,entryName);if(target.exists())
continue;zipReader.extract(entryName,target);try{target.permissions|=FileUtils.PERMS_FILE;}
catch(e){dump("Failed to set permissions "+aPermissions.toString(8)+" on "+target.path+"\n");}}}
finally{zipReader.close();}}};