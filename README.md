# LTXNote

A note taking app that includes LaTeX formula rendering

## Installation

### Option 1:

Clone the repository, enter the file and install all packages:

<pre><code>
git clone --depth 1 --branch main https://github.com/David207025/LTXNote.git ltxnote
cd ltxnote
npm install</code></pre>

Right after finishing the installation, run `npm run package`.

The installation files will then be found inside **_release/build_**.

### Option 2:

Install the program using the provided Installers. Option 1 is however recommended due to a number of reasons such as:

- tailored creation of install files directly on target machine
- no OS version crash on install

## Features

- Standard TextFields from TLdraw now allow LaTeX math formula formatting.
- Able to save and load Notebooks
- Creating your own file structure
- Create, Delete and Rename any folder or notebook

### Future Development

- Ability to export notes
- Converting to a PDF or PNG

Recommendations are appreciated

## Usage

### Creating Notebook

To create a notebook, click on the three dots on the sidebar next to the LTXNote title and then press `New Notebook`.

After typing in the name, press enter or click away to create the file.

To cancel, click away while the input field is empty or press **Esc**.

### Creating Directories

Creating a folder works just like creating a notebook.

You only need to click on `New Folder` instead of `New Notebook`.

### Creating Subelements

To create subelements (like files/folders inside folders) right click on the folder to open a pop-up menu from which you can create new elements.

### Editing elements

These actions can only be done if neither the element, nor any of its children are open at the time.

E.g.: You cannot rename folder math if math/homework is open

#### Renaming elements

Right click on an element and choose rename. Type in the new name and press enter. If the name is empty, the rename will be canceled and the previous name will be kept.

#### Moving elements

Right click on an element and choose move.

The element will then get highlighted. Afterwards, choose the location of the new file/folder, right click on it (or press the three dots in case the destination is the root directory) and press `Move Here` to move or `Cancel Move` to cancel

#### Deleting elements

Right click on an element and choose delete.
A warning will show up on the screen and you will be asked for confirmation before deleting.

### Importing new Notes

To import new notes, simply double click on a file with the `.ltxnote` extension. The file will then be copied to the directory of all your other files.

_**Atention:**_ Editing an imported file will not change the previous file. To be able to forward it again, you will have to export it or upload it from: _**resPath/assets/notes**_

### Exporting Notes

Currently not implemented

### Creating math notes

To add equations to your notes, simply create a text box and type the following:
`$$[equation]$$`
And replace **[equation]** with your LaTeX math equations.

_**Attention:**_ If there is a `$` inside the equation, the formatting will not take place and the text will be treated like a normal input and shown as normal text (without the leading and trailing `$$`)

## Credits

This program was created using the electron-react-boilerplate for the background and TLdraw for the Whiteboard. MUI was used for the GUI.
