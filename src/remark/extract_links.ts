
import { Link, LinkReference } from 'mdast';
import { definitions as parseDefinitions } from 'mdast-util-definitions';
import { visit } from 'unist-util-visit';
import path from 'node:path';
import { Root } from 'remark-parse/lib';



export default function* extractLinkTargets(node: Root, filename: string): Generator<string> {
  const definitions = parseDefinitions(node);

  const linkTargets: string[] = [];

  visit(node, (node) => {
    if (node.type === 'link') {
      //TODO: Even links to headers are links. Handle them differently.
      //TODO: Handle differently https links.
      linkTargets.push((node as Link).url);
    }

    if (node.type === 'linkReference') {
      const definition = definitions((node as LinkReference).identifier);

      if (definition) {
        linkTargets.push(definition.url);
      }
    }
  });


  for (const target of linkTargets) {
    //Will concat strings from right to left (param order) until absolute path
    //is achieved.
    yield path.resolve(path.dirname(filename), target);
  }
}
