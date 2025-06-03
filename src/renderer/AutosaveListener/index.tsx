import { Box, TLTextShape, useEditor } from '@tldraw/tldraw';
import { useEffect, useState } from 'react';

export function AutoSaveAllChanges(props: {
  filePath: string;
  currentPageId: string;
  setCurrentPageId: any;
  setVisible: any;
  setFinished: any;
}) {
  const editor = useEditor();

  useEffect(() => {
    const loadFile = async () => {
      props.setVisible(false);
      props.setFinished(false);

      if (!editor) return;

      const json = await window.electron.loadShapes(props.filePath);
      console.log(json);

      let snapshot = {};

      if (!json) {
        const jsonStr = await window.electron.getSnapshot();
        console.log(jsonStr);
        snapshot = jsonStr;
        return;
      } else {
        snapshot = JSON.parse(json);
      }

      // Wait for layout flush (avoids ResizeObserver warning)
      requestAnimationFrame(() => {
        editor.loadSnapshot(snapshot);
        props.setVisible(true);
        props.setFinished(true);
        setTimeout(() => {
          const page = editor.getCurrentPage();
          const shapeIds = editor.getPageShapeIds(page.id);

          for (const id of shapeIds) {
            const shape = editor.getShape(id);
            if (!shape) return;
            if (shape?.type === 'text') {
              editor.updateShape({
                id,
                type: 'text',
                props: {
                  ...shape.props,
                  scale: (shape as TLTextShape).props.scale + 0.0001, // force re-render
                },
              });
            }
          }
        }, 0);
      });
    };

    loadFile();
  }, [props.filePath]);

  useEffect(() => {
    const page = editor.getCurrentPage();
    const elements = editor.getPageShapeIds(page.id);
    elements.forEach((id) => {
      const shape = editor.getShape(id);
      if (!shape) return;
      if (shape.type == 'text') {
        editor.updateShape({
          id,
          type: shape.type,
          props: {
            ...shape.props,
            scale: (shape as TLTextShape).props.scale + 0.0001,
          },
        });
      }
    });

    const newPageId = editor.getCurrentPageId();
    if (newPageId !== props.currentPageId) {
      console.log('Page changed!');
      // Your logic here
      props.setCurrentPageId(newPageId);
    }
  }, [props.currentPageId]);

  useEffect(() => {
    const cleanup = editor.store.listen(
      // Listen to all changes
      async () => {
        if (!editor) return;
        const snapshot = editor.getSnapshot();
        console.log(props.filePath);
        const json = JSON.stringify(snapshot, null, 2);
        await window.electron.saveShapes(json, props.filePath);
      },
      { source: 'user', scope: 'document' }, // Only react to user changes to shapes
    );

    return () => cleanup();
  }, [editor, props.filePath]);

  return null;
}
