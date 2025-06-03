// global.d.ts
export {};

declare global {
  type FileEntry = {
    name: string;
    path: string;
    isDirectory: boolean;
  };
  interface FileTreeNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileTreeNode[];
  }
  interface Window {
    electronAPI: {
      saveShapes: (json: string, file: string) => Promise<void>;
      loadShapes: (file: string) => Promise<string | null>;
      readDirectory: (directory: string) => Promise<FileEntry[]>;
      createFile: (
        directory: string,
        name: string,
      ) => Promise<{ success: boolean }>;
      createFolder: (
        directory: string,
        name: string,
      ) => Promise<{ success: boolean }>;
      deletePath: (path: string) => Promise<{ success: boolean }>;
      renamePath: (path: string, newName: string) => Promise<void>;
      getResourcePath: () => Promise<string>;
      setSnapshot: (snapshot: any) => Promise<void>;
      getSnapshot: () => Promise<any>;
      getOpenedFile: () => Promise<string | null>;
      getFolderTree: (path: string) => Promise<FileTreeNode>;
    };
  }
}
