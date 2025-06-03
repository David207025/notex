// Whiteboard.tsx (or wherever Tldraw is used)
import { Editor, Tldraw, useEditor } from '@tldraw/tldraw';
import {
  DefaultActionsMenu,
  DefaultKeyboardShortcutsDialog,
  DefaultKeyboardShortcutsDialogContent,
  defaultShapeTools,
  defaultShapeUtils,
  DefaultToolbar,
  DefaultToolbarContent,
  defaultTools,
  TLComponents,
  TldrawUiMenuItem,
  TLEditorSnapshot,
  TLUiOverrides,
  TLUiToolsContextType,
  useIsToolSelected,
  useTools,
} from 'tldraw';
import LatexTextShapeUtil from '../LatexTextShapeUtil';
import { useEffect, useReducer, useState } from 'react';
import { AutoSaveAllChanges } from '../AutosaveListener';

type WhiteboardProps = {
  editorState: any[]; // the shape data from App
  setEditorState: (state: any[]) => void;
  file: string;
  currentPageId: string;
  setCurrentPageId: (id: string) => void;
  onDraw: () => void; // callback when user draws and no file open
};

const overrides: TLUiOverrides = {
  //[b]
  tools(_editor, tools): TLUiToolsContextType {
    const newTools = { ...tools, draw: { ...tools.draw, kbd: 'p' } };
    return newTools;
  },
};

export const Whiteboard = (props: {
  file: string;
  currentPageId: string;
  setCurrentPageId: any;
}) => {
  const shapeUtils = [
    ...defaultShapeUtils.map((UtilClass) =>
      UtilClass.type === 'text' ? LatexTextShapeUtil : UtilClass,
    ),
  ];
  const [visible, setVisible] = useState(true);
  const [finished, setFinished] = useState(false);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: visible ? 'block' : 'none',
        opacity: finished ? '100%' : '0%',
      }}
    >
      <Tldraw
        shapeUtils={shapeUtils}
        overrides={overrides}
        onMount={(editor) => {
          const snapshot = editor.getSnapshot();
          window.electron.setSnapshot(snapshot);
        }}
      >
        <AutoSaveAllChanges
          filePath={props.file}
          currentPageId={props.currentPageId}
          setCurrentPageId={props.setCurrentPageId}
          setVisible={setVisible}
          setFinished={setFinished}
        />
      </Tldraw>
    </div>
  );
};
