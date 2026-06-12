import React from 'react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="flex justify-center py-3">
      <span className="text-[11px] text-gray-500 dark:text-white/40">
        &copy; {year}{' '}
        <a
          href="https://www.princebansal.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-700 dark:text-purple-400 hover:text-violet-900 dark:hover:text-purple-300 font-medium transition-colors duration-150"
        >
          princebansal.in
        </a>
      </span>
    </footer>
  );
};

export default Footer;
