import React from 'react'
import Search from './Components/Search.jsx'
import {useState,useEffect} from 'react'
import Spinner from './Components/Spinner.jsx';
import MovieCard from './Components/MovieCard.jsx';
import {useDebounce} from 'react-use';
import { getTrendingMovies, updateSearchCount } from './appwrite.js';

const API_BASE_URL = 'https://api.themoviedb.org/3'

// The API key is kept as environment variable
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

// As per the API documentation we need to GET the data in json object via Authorization using API_KEY  
const API_OPTIONS={
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  }
}


const App = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  // This state will contain the list of the list of movies fetched from TMDB API.
  const [movieList, setMovieList] = useState([]);

  // This state is used to make sure till the time the data is loading from the API the user is shown the loading page
  const [isLoading, setIsLoading] = useState(false);

  // This state is used to optimize search query using debounce technique
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // State to get your trending movies based on the peoples searches
  const [trendingMovies, setTrendingMovies] = useState([]);

  // Debounce the search term to prevent making too many API requests
  // by waiting for the user to stop typing for 500ms
  useDebounce(() => setDebouncedSearchTerm(searchTerm),500,[searchTerm]);

  const fetchMovies = async (query = '') => {

    // Before we start fetching the data via API loading screen must be presented 
    setIsLoading(true);
    setErrorMessage('');
    try{
      // Endpoint from where the data will be fetched is set 
      const endpoint = query 
      //Query to search the elements 
      ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
      // Basic query to display the top 20 movies when the search is not performed
      :`${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
      // Await till the response is fetched using endpoint and API OPTIONS - check API documentation for further clarification. 
      const response = await fetch(endpoint,API_OPTIONS);
      if(!response.ok){
        throw new Error(`Failed to fetch movies ${response.status}`);
      }
      const data = await response.json();
      
      // Check to handle if there is no response in the data object having all the movies 
      if(data.Response === 'False'){
        setErrorMessage(data.Error || 'Failed to fetch movies');
        setMovieList([]);
        return;
      }

      // if there is no error populate the movieList with the array of first 20 popular movies fetched
      setMovieList(data.results || []);

      // Whenever the query is made the data gets registered in the database.
      if(query && data.results.length > 0 ){
        await updateSearchCount(query,data.results[0]);
      }
      
    }catch(error){
      console.error(`Error fetching movies : ${error}`);
      setErrorMessage(`Error fetching movies. Please try again later.`);
    } finally{
      setIsLoading(false);
    }


  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();
      setTrendingMovies(movies);
    } catch (error) {
      //Here we will not set the error message using it's state hook 
      //since incase if the trending movies functionality is not working then it will also not 
      //render the Popular movies as well since it is dependent on the errorMessage.
      console.log(`Error fetching trending movies.`);
    }
  }

  useEffect(() => {
    fetchMovies(debouncedSearchTerm);
  },[debouncedSearchTerm]);

  useEffect(() => {
    loadTrendingMovies();
  }, []);

  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <header>
          <img src="./hero.png" alt="Hero Banner" />
          <h1>Find <span className="text-gradient">Movies</span> You'll Enjoy Without the Hassle</h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm}/>
        </header>

        {trendingMovies.length > 0 && (
          <section className='trending'>
            <h2>
              Trending Movies
            </h2>
            <ul>
              {trendingMovies.map((movie,index) => (
                <li key = {movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className='all-movies'>
          <h2>All Movies</h2>
          {isLoading ? (
            <Spinner/>
          ):errorMessage?(
            <p className='text-red-500'>{errorMessage}</p>
          ):
          (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie}/>
              ))}
            </ul>
          )} 
        </section>
      </div>
    </main>
  )
}

export default App
