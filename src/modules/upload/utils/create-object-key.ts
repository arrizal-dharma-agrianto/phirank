const createObjectKey = (folder: string, fileName: string) => {
  return `${folder}/${crypto.randomUUID()}-${fileName}`;
}

export { createObjectKey }