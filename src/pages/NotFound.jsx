import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-8">
        <SearchX className="w-16 h-16 text-indigo-500" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404 - Page Not Found</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        Oops! The page you are looking for doesn't exist or has been moved.
      </p>
      <Link 
        to="/" 
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-colors shadow-lg hover:shadow-indigo-500/30"
      >
        Take Me Home
      </Link>
    </div>
  );
};

export default NotFound;
