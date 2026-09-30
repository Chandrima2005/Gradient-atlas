// The five stages of the data science pathway.
// To open a stage when its material is ready: set status to 'live' and give it an href.
// The module lists for stages marked 'soon' are a planned outline and can be edited freely.
export const TRACKS = [
  {
    id: 'python', n: 1, title: 'Python', v: '--p1', status: 'soon',
    sub: 'The language everything else is written in.',
    mods: ['Setup and first program', 'Variables and data types', 'Strings', 'Control flow', 'Loops', 'Functions', 'Lists, tuples, sets, dicts', 'Comprehensions', 'Files and errors', 'Modules and packages', 'Classes and OOP', 'Virtual environments'],
  },
  {
    id: 'libs', n: 2, title: 'Python libraries', v: '--p3', status: 'soon',
    sub: 'The data toolkit: arrays, tables and charts.',
    mods: ['NumPy arrays', 'NumPy maths and broadcasting', 'pandas Series and DataFrames', 'Cleaning data with pandas', 'Grouping, joining, reshaping', 'Matplotlib', 'Seaborn', 'SciPy essentials'],
  },
  {
    id: 'ml', n: 3, title: 'Machine learning', v: '--p4', status: 'live', href: '#route-ml',
    sub: 'Every classic algorithm built from scratch, then checked against scikit-learn.',
    mods: ['Maths foundations', 'Data and features', 'Model evaluation', 'Linear and logistic regression', 'Trees and ensembles', 'SVMs and k-NN', 'Clustering', 'Tuning and deployment'],
    stats: '24 chapters · ~16 h',
  },
  {
    id: 'dl', n: 4, title: 'Deep learning', v: '--p2', status: 'soon',
    sub: 'Neural networks, from one neuron to transformers.',
    mods: ['Neurons and activations', 'Backpropagation by hand', 'Training and optimisers', 'PyTorch basics', 'CNNs for images', 'RNNs and LSTMs', 'Attention', 'Transformers'],
  },
  {
    id: 'genai', n: 5, title: 'Generative AI', v: '--p5', status: 'soon',
    sub: 'LLMs, prompting, RAG and LangChain.',
    mods: ['How LLMs work', 'Tokens and embeddings', 'Prompt engineering', 'Vector databases', 'RAG', 'LangChain basics', 'Chains and memory', 'Agents and tools', 'Evaluating LLM apps'],
  },
];
export const TRACK = Object.fromEntries(TRACKS.map(t => [t.id, t]));
