function supportBundle(snapshot,{version,platform,arch}){
 return {format:'tgg-remote-support-v1',createdAt:new Date().toISOString(),app:{version,platform,arch},scope:'Owner-reviewed project text. No live screen access or remote command execution.',files:snapshot.files.map(file=>({path:file.path,content:file.content})),skipped:[...snapshot.skipped]};
}
module.exports={supportBundle};
