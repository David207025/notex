import React from 'react';
import {
  BaseBoxShapeUtil,
  TLBaseShape,
  useEditor,
  toDomPrecision,
  Rectangle2d,
  DefaultColorStyle,
  DefaultSizeStyle,
  DefaultColorThemePalette,
  StyleProp,
  EnumStyleProp,
  TextShapeTool,
  TLUiOverrides,
  DefaultKeyboardShortcutsDialog,
  DefaultKeyboardShortcutsDialogContent,
  DefaultToolbar,
  DefaultToolbarContent,
  TLComponents,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
  useRelevantStyles,
  DefaultFontStyle,
  ShapeUtil,
  TextShapeUtil,
  TLTextShape,
  TLTextShapeProps,
  HTMLContainer,
  JsonObject,
  TLShapeId,
  TLGeometryOpts,
  getDefaultColorTheme,
  IndexKey,
  TLParentId,
} from '@tldraw/tldraw';
import Latex from 'react-latex';
import 'katex/dist/katex.min.css';
import 'tldraw/tldraw.css';
import '../App.css';

export default class LatexTextShapeUtil extends TextShapeUtil {
  static override type = 'text' as const;

  onStyleChange(shape: any, style: any, value: any): Partial<any> {
    if (style.id === DefaultColorStyle.id) {
      return {
        props: {
          ...shape.props,
          color: value,
        },
      };
    }
    return {};
  }

  override getDefaultProps(): TLTextShapeProps {
    const style = this.editor.getStyleForNextShape(DefaultColorStyle);

    return {
      w: 200,
      color: (style[DefaultColorStyle.id as any] ?? 'black') as any,
      size: (style['size' as any] ?? 'm') as any,
      font: (style[DefaultFontStyle.id as any] as any) ?? 'draw',
      scale: 1,
      textAlign: 'start',
      autoSize: true,
      richText: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '\u200B' }],
          },
        ],
      },
    };
  }

  private getPlainText(richText: TLTextShapeProps['richText']) {
    if (!richText?.content) return '';
    return richText.content
      .map((block: any) =>
        block.content
          ? block.content.map((node: any) => node.text || '').join('')
          : '',
      )
      .join('\n');
  }

  override component(shape: TLTextShape) {
    const editor = useEditor();
    const isEditing = editor.getEditingShapeId() === shape.id;
    const [editingText, setEditingText] = React.useState(
      this.getPlainText(shape.props.richText),
    );
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const textdivRef = React.useRef<HTMLDivElement>(null);

    const fontSize = this.getFontSize(shape);
    const fontFamily = this.getFontFamily(shape);

    React.useLayoutEffect(() => {
      if (isEditing) {
        const timeout = setTimeout(() => {
          updateDimensions(); // recalculate and update shape size
        }, 0);

        return () => clearTimeout(timeout);
      }
    }, [isEditing, editingText]);

    React.useEffect(() => {
      if (isEditing) {
        setEditingText(this.getPlainText(shape.props.richText));
        setTimeout(() => {
          textareaRef.current?.focus();
          updateDimensions();
        }, 0);
      }
      editor.updateShapes([
        {
          id: shape.id,
          type: shape.type,
          props: {
            ...shape.props,
            scale: shape.props.scale + 0.0001, // harmless nudge
          },
        },
      ]);
    }, [isEditing, shape.id]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setEditingText(newText);

      const safeText = newText.trim() === '' ? '\u200B' : newText;
      const newRichText = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: safeText }],
          },
        ],
      };

      updateDimensions();

      editor.updateShapes([
        {
          id: shape.id,
          type: shape.type,
          props: {
            ...shape.props,
            richText: newRichText,
          },
        },
      ]);
    };

    const updateDimensions = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height to get true scrollHeight
        const width = textareaRef.current.scrollWidth;
        const height = textareaRef.current.scrollHeight;

        // Prevent unnecessary updates
        if (shape.props.w !== width) {
          editor.updateShapes([
            {
              id: shape.id,
              type: 'text',
              props: {
                ...shape.props,
              },
            },
          ]);
          textareaRef.current.style.height = height + 'px';
        }

        // Apply new height
      }
      if (textdivRef.current) {
        textdivRef.current.style.height = 'auto'; // Reset height to get true scrollHeight
        const width = textdivRef.current.scrollWidth;
        const height = textdivRef.current.scrollHeight;

        // Prevent unnecessary updates
        if (shape.props.w !== width) {
          editor.updateShapes([
            {
              id: shape.id,
              type: 'text',
              props: {
                ...shape.props,
              },
            },
          ]);
          textdivRef.current.style.height = height + 'px';
        }

        // Apply new height
      }
    };

    updateDimensions();

    const rows = this.getPlainText(shape.props.richText).split('\n');

    const parts: string[][] = [];

    rows.forEach((row) => {
      parts.push(row.split(/(\$\$.*?\$\$)/g));
    });

    return (
      <HTMLContainer
        id={'container:' + shape.id}
        style={{
          fontSize,
          fontFamily,
          color: getDefaultColorTheme({
            isDarkMode: editor.user.getIsDarkMode(),
          })[shape.props.color].fill,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          cursor: isEditing ? 'text' : 'default',
          lineHeight: '1.6',
          display: 'inline-flex',
          flexDirection: 'column',
          justifyContent:
            shape.props.textAlign == 'middle'
              ? 'center'
              : shape.props.textAlign,
          alignItems: 'start',
          width: 'fit-content',
          marginLeft:
            shape.props.textAlign == 'end' || shape.props.textAlign == 'middle'
              ? 'auto'
              : '0',
          marginRight:
            shape.props.textAlign == 'start' ||
            shape.props.textAlign == 'middle'
              ? 'auto'
              : '0',
          height: 'fit-content',
          textWrap: 'wrap',
          padding: '0px',
          userSelect: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems:
              shape.props.textAlign == 'middle'
                ? 'center'
                : shape.props.textAlign,
            justifyContent: 'start',
            width: '100%',
          }}
          onLoad={() => {
            updateDimensions();
            editor.updateShapes([
              {
                id: shape.id,
                type: 'text',
                props: {
                  ...shape.props,
                  scale: shape.props.scale + 0.0001,
                },
              },
            ]);
          }}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editingText}
              onChange={handleChange}
              style={{
                fontSize,
                fontFamily,
                color: getDefaultColorTheme({
                  isDarkMode: editor.user.getIsDarkMode(),
                })[shape.props.color].fill,
                resize: 'none',
                border: 'none',
                outline: 'none',
                padding: 0,
                boxSizing: 'border-box',
                lineHeight: '1.6',
                right: '0px',
                backgroundColor: 'transparent',
                textAlign:
                  shape.props.textAlign == 'middle'
                    ? 'center'
                    : shape.props.textAlign,
                marginLeft:
                  !isEditing &&
                  (shape.props.textAlign == 'end' ||
                    shape.props.textAlign == 'middle')
                    ? 'auto'
                    : '0',
                marginRight:
                  !isEditing &&
                  (shape.props.textAlign == 'start' ||
                    shape.props.textAlign == 'middle')
                    ? 'auto'
                    : '0',
              }}
            />
          ) : (
            parts.map((arr) => (
              <div
                style={{
                  textAlign:
                    shape.props.textAlign == 'middle'
                      ? 'center'
                      : shape.props.textAlign,
                }}
              >
                {arr.map((element) =>
                  element.startsWith('$$') ? (
                    <Latex>{element}</Latex>
                  ) : (
                    <>{element}</>
                  ),
                )}
                <br />
              </div>
            ))
          )}
        </div>
      </HTMLContainer>
    );
  }

  private getFontSize(shape: TLTextShape): number {
    const sizes = { s: 16, m: 20, l: 24, xl: 32, xxl: 48 };
    const index = Object.keys(sizes).indexOf(`${shape.props.size}`);
    return Object.values(sizes)[index] ?? 16;
  }

  private getFontFamily(shape: TLTextShape): string {
    const families = {
      code: 'monospace',
      sans: 'system-ui, sans-serif',
      serif: 'serif',
      draw: '"Comic Sans MS", cursive',
    };
    const index = Object.keys(families).indexOf(`${shape.props.font}`);

    return Object.values(families)[index] ?? '"Comic Sans MS", cursive';
  }

  override getGeometry(shape: TLTextShape, opts: TLGeometryOpts): Rectangle2d {
    const container = document.getElementById('container:' + shape.id);
    const prev = super.getGeometry(shape, opts);
    return new Rectangle2d({
      width: prev.w,
      height: container ? container?.scrollHeight : 200,
      isFilled: false,
    });
  }

  override canEdit = () => true;
}
