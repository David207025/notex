import { Whiteboard } from './Whiteboard';
import './App.css';
import { useEffect, useMemo, useReducer, useState } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { ThemeProvider } from '@emotion/react';
import {
  createTheme,
  CssBaseline,
  PaletteMode,
  Theme,
  ThemeOptions,
} from '@mui/material';
import FileExplorer from './FileExplorer';

function getDefaultTheme(mode: PaletteMode): ThemeOptions {
  return {
    palette: {
      mode,
    },
  };
}

export default function App() {
  const [currentPageId, setCurrentPageId] = useState('');
  const [mode, setMode] = useState<PaletteMode>('dark');
  const [notesPath, setNotesPath] = useState<string>('');
  const [openedFile, setOpenedFile] = useState<string>('');
  const theme = useMemo(() => createTheme(getDefaultTheme(mode)), [mode]);
  console.log('Reloaded');
  useEffect(() => {
    window.electron.getResourcePath().then((res) => {
      setNotesPath(res + '/notes');

      window.electron.getOpenedFile().then((res) => {
        if (res !== null) {
          setOpenedFile(res);
        }
      });
    });
  }, []);

  console.log(openedFile);

  return (
    <ThemeProvider theme={theme}>
      <div id="layout">
        <Paper
          sx={{
            height: '100vh',
            width: '10cm',
          }}
        >
          <FileExplorer
            rootPath={notesPath}
            openedFile={openedFile}
            onOpenFile={(filePath) => {
              setOpenedFile(filePath);
              console.log('New file path: ' + filePath);
            }}
            onCloseFile={(filePath) => {
              setOpenedFile('');
            }}
          />
        </Paper>
        <div id="main-content">
          <Whiteboard
            file={openedFile}
            currentPageId={currentPageId}
            setCurrentPageId={setCurrentPageId}
          />
        </div>
      </div>
      <CssBaseline />
    </ThemeProvider>
  );
}
