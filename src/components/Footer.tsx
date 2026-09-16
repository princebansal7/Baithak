import React from 'react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="flex justify-center py-3">
      <span className="text-[11px] text-stone-500 dark:text-stone-500">
        &copy; {year}{' '}
        <a
          href="https://www.princebansal.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-crimson-600 dark:text-mustard-400 hover:text-crimson-800 dark:hover:text-mustard-300 font-semibold transition-colors duration-150"
        >
          princebansal.in
        </a>
      </span>
    </footer>
  );
};

export default Footer;
