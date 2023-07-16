declare module 'virtual:vite-plugin-md-graph/graph' {
  interface Edge {
    from: NodeId,
    to: NodeId,
  }
  interface Vertex {
    id: NodeId,
    filename: string,
  }

  export interface Graph {
    vertices: Array<Vertex>,
    edges: Array<Edge>,
  }

  export default Graph;
}
