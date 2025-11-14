/**
 * Philosophical quotes about quantum mechanics, measurement, and reality
 * Used in the Observer Effect Terminal easter egg
 */

export const quantumQuotes = [
  {
    quote:
      'The observer, when he seems to be observing a stone, is really, if physics is to be believed, observing the effects of the stone upon himself.',
    author: 'Bertrand Russell',
  },
  {
    quote:
      'It is wrong to think that the task of physics is to find out how Nature is. Physics concerns what we say about Nature.',
    author: 'Niels Bohr',
  },
  {
    quote: 'What we observe is not nature itself, but nature exposed to our method of questioning.',
    author: 'Werner Heisenberg',
  },
  {
    quote:
      'The wave function has not collapsed, I have merely stopped asking about the wave function and started asking about the particle.',
    author: 'David Mermin',
  },
  {
    quote: "Reality is that which, when you stop believing in it, doesn't go away.",
    author: 'Philip K. Dick',
  },
  {
    quote: 'The universe is not only queerer than we suppose, but queerer than we can suppose.',
    author: 'J.B.S. Haldane',
  },
  {
    quote: "If you think you understand quantum mechanics, you don't understand quantum mechanics.",
    author: 'Richard Feynman',
  },
  {
    quote: 'The quantum theory cannot be formulated as a description of an objective reality.',
    author: 'John Bell',
  },
  {
    quote:
      'The act of observation is not a passive act but an active engagement that shapes reality.',
    author: 'Unknown',
  },
  {
    quote: 'In quantum mechanics, the observer and the observed are inextricably linked.',
    author: 'Erwin Schrödinger',
  },
];

/**
 * Get a random quantum/philosophical quote
 */
export function getRandomQuantumQuote(): { quote: string; author: string } {
  return quantumQuotes[Math.floor(Math.random() * quantumQuotes.length)]!;
}
