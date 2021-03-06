# AnsiEdit file format

The entire file is constructed of 'blocks', each block has a header that contains a unique id for that section (4 bytes), a value indicating the compression method for the bytes that follow (1 byte, 0 for uncompressed, 1 for the Lempel-Ziv 1977 compression algorithm), the length of the block in bytes not counting the header (32 bits), and finally, the series of bytes for that section.

All numbers are stored in little endian (intel) format.

The entire file is contained in a block with the the id "ANSi", which also serves as the magic number. After the header follows the series of bytes, which are also composed of multiple blocks, each containing a semantic group which can be processed, or ignored, as required. This structure enables the file format the flexibility to be extended relatively painlessly.

The particular compression strategy AnsiEdit uses by default is to compress rhe 'ANSi' block, i.e. the entire file, with an implementation of the [LZ77 compression algorithm](http://en.wikipedia.org/wiki/LZ77_and_LZ78). Please see [scripts/lz77.js](scripts/lz77.js) for the exact details, or [the same implementation in portable C](https://github.com/andyherbert/andyh.org/blob/master/_posts/2013-06-22-LZ1-Postscript.markdown). The default pointer length used by AnsiEdit is set to '5', but as the pointer length is also included in the compressed data, the compression strategy can be changed on a per-block basis if required.

Currently, the types of blocks used are:

**ALL BLOCK FORMATS ARE SUBJECT TO CHANGE**

## DISP

Contains the information to display the current image.

  - columns (16bits)
  - rows (16bits)
  - noblink/iCEColors (8bits 1 for true/on, 0 for false/off)
  - display data (n 8bit bytes)

The display data is composed of sequences of the following structure:

  - character code (8bits)
  - foreground/background (8bits, with the background color in the upper 4bits)

The display data describes the state of the screen as read from left to right, and top to bottom.

## FONT

Contains the font data for the image.

  - font width (8 bits)
  - font height (8 bits)
  - font data (n 8 bit bytes)

To ensure compatibility with the XBin file format, the only valid value for font width is 8. the height is any value between 1 and 32, and the font data is the same as XBin format, i.e. in a 16 pixel high font, the first 16 bytes are the bitmask for ascii value 0, the next set of 16 bytes are for value 1, and so on.

## PALE

Contains the palette data for the image.

  - 16 iterations of RGB data corresponding to each color in ascending numerical order.

A single instance of RGB data consists of:

  - red (8bits) ranging from a value from 0 to 63, inclusive.
  - green (8bits) ranging from a value from 0 to 63, inclusive.
  - blue (8bits) ranging from a value from 0 to 63, inclusive.

## META

A subset of SAUCE metadata.

  - title (null-terminated sequence of ascii values)
  - author (null-terminated sequence of ascii values)
  - group (null-terminated sequence of ascii values)

## UNDO

A description of the complete undo history.

Multiples of:

  - type of undo chunk (8bits, used when replaying the buffer outside the editor, for instance, whether the undo chunk represents an canvas-resize operation)
  - length of 'undo chunk' (32bits)
  - chunk data (n 8bit bytes)
 
For drawing, the chunk data is composed of sequences of the following structure:

  - character code (8bits)
  - foreground/background (8bits, with the background color in the upper 4bits)
  - index (32bits, the position of the character code as the screen is read sequentially, left to right and top to bottom)

And for canvas-resize information:

  - columns (16 bits)
  - rows (16 bits)
  - display data (n 8bit bytes)

The display data is in exactly the same format as the data contained in the DISP block.

## TOOL

The state of individual tools in the editor.

  - current color (8bits, valid values range from 1 to 16)  
  - current tool (null-terminated sequence of ascii values)
  - tool data (n 8bit bytes)

Tool data is composed of multiples of:

  - uid (null-terminated sequence of ascii values which contains the uid of the specific tool)
  - length (32bits, the length of bytes that follow this number)
  - bytes (a sequence of 8bit bytes that are passed to the tool in order to recall its state)

