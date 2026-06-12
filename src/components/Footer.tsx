import React from 'react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="flex justify-center py-3">
      <span className="text-[11px] text-gray-400/50 dark:text-white/20">
        &copy; {year}{' '}
        <a
          href="https://www.princebansal.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400/60 dark:text-purple-400/50 hover:text-purple-500 dark:hover:text-purple-300 transition-colors duration-150"
        >
          princebansal.in
        </a>
      </span>
    </footer>
  );
};

export default Footer;
