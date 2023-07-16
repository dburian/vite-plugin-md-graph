import { AcornNode, Plugin } from 'rollup';
import { globIterate } from 'glob';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import extractLinkTargets from './remark/extract_links.js';
import { read } from 'to-vfile';

interface MdGraphOptions {
  rootDir: string,
}

//TODO: for importing folder
const GRAPH_VIRT_MODULE_ID = 'virtual:vite-plugin-md-graph/graph';
const GRAPH_DATA_RESOLVED_ID = '\0' + GRAPH_VIRT_MODULE_ID;


const NOTE_VIRT_MODULE_ID_RE = /\..*\/virtual:vite-plugin-md-graph\/note\/([0-9]+)\.md/;
const NOTE_RESOLVE_ID_PREFIX = '\0note?';


function markdownPaths(rootDir: string): AsyncGenerator<string> {
  return globIterate(rootDir + path.sep + '**' + path.sep + '*.md', { ignore: '.git', maxDepth: 20 });
}




export type NoteId = number;

interface Link {
  from: NoteId,
  to: NoteId,
}
interface Note {
  id: NoteId,
  filename: string,
}

export class Graph {
  vertices: Array<Note>;
  edges: Array<Link>;

  constructor() {
    this.vertices = [];
    this.edges = [];
  }
}

type NoteStore = Map<string, Note>;

interface LoadedNoteDir {
  graph: Graph,
  notes: Map<string, Note>
}

async function loadNoteDir(dir: string): Promise<LoadedNoteDir> {
  const filepathGen = markdownPaths(dir);

  const g: Graph = { vertices: [], edges: [] };
  const notes = new Map<string, Note>();

  interface StringEdge {
    from: string,
    to: string,
  }

  const linksByFilename: Array<StringEdge> = [];

  const parser = unified().use(remarkParse);

  for await (const filename of filepathGen) {

    const ast = parser.parse(await readFile(filename, { encoding: 'utf8' }));

    const newNote = { id: notes.size, filename: filename };
    g.vertices.push(newNote);
    notes.set(filename, newNote);

    for (const linkTarget of extractLinkTargets(ast, filename)) {
      linksByFilename.push({ from: filename, to: linkTarget });
    }
  }

  for (const edge of linksByFilename) {
    if (notes.has(edge.from) && notes.has(edge.to)) {
      g.edges.push({
        from: notes.get(edge.from)!.id, to: notes.get(edge.to)!.id
      });
    }
  }


  return { graph: g, notes: notes };
}


async function processNote(filename: string): Promise<string> {
  const parser = unified().use(remarkParse).use(remarkRehype).use(rehypeStringify);

  return parser.process(await read(filename, { encoding: 'utf8' }));
}

export function mdGraph(opts: MdGraphOptions): Plugin {

  let loadedNotes: NoteStore = new Map<string, Note>();

  return {
    name: 'mdGraph',

    resolveDynamicImport: (source: string | AcornNode) => {
      if (typeof source !== 'string') return null;
      console.log(`dynamic import ${source}`);

      const matches = source.match(NOTE_VIRT_MODULE_ID_RE);
      if (matches !== null && matches.length == 0) {
        return NOTE_RESOLVE_ID_PREFIX + matches[0];
      }

      return null;
    },
    resolveId: (source) => {
      console.log(`resolveId: ${source}`);
      if (source === GRAPH_VIRT_MODULE_ID)
        return GRAPH_DATA_RESOLVED_ID;

      return null;
    },
    async load(id: string) {
      if (id === GRAPH_DATA_RESOLVED_ID) {
        // const graph = await loadDir(opts.rootDir);
        const { graph, notes } = await loadNoteDir(opts.rootDir);
        loadedNotes = notes;

        return `export default ${JSON.stringify(graph)};`;
      }
      if (id.startsWith(NOTE_RESOLVE_ID_PREFIX)) {
        const noteId = id.substring(0, NOTE_RESOLVE_ID_PREFIX.length);

        const loadedNote = loadedNotes.get(noteId);
        if (loadedNote) {
          const root = processNote(loadedNote.filename);
          return `export default ${JSON.stringify({ html: root, ...loadedNote })};`;
        }

        return null;
      }

    },
  };
}

