// ===================== GROOVIX AI ASSISTANT =====================
const AI = (() => {
  const chatWindow = document.getElementById('chatWindow');
  const chatInput  = document.getElementById('chatInput');
  const sendBtn    = document.getElementById('sendBtn');

  // ---- Gemini API config ----
  // Get a FREE key at: https://aistudio.google.com/app/apikey
  const GEMINI_API_KEY = 'AIzaSyAlMjrTo-wkUk_8TghzTJVSvYEwhv0QIMg';
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const SYSTEM_PROMPT = `You are Groovix AI, a music expert assistant built into the Groovix music player app.
You know everything about music worldwide — artists, songs, albums, genres, music history, lyrics meaning, chart performance, collaborations, awards, and more.
You answer like a knowledgeable music journalist — friendly, conversational, and detailed.
Keep responses concise but informative. Use plain text, no markdown symbols like ** or ##.
If asked about downloading music, recommend free legal sources: YouTube (via yt-dlp), SoundCloud, Free Music Archive, Jamendo, Bandcamp.
Never recommend paid streaming apps like Spotify, Apple Music, or Audiomack.
If asked about the current song or artist playing, use the context provided.`;

  // ---- Download sources (offline fallback) ----
  const downloadSources = [
    { name: 'YouTube (via yt-dlp)', url: 'https://github.com/yt-dlp/yt-dlp', desc: 'Free open-source tool to download audio from YouTube' },
    { name: 'SoundCloud',           url: 'https://soundcloud.com',            desc: 'Many artists offer free downloads on their pages' },
    { name: 'Free Music Archive',   url: 'https://freemusicarchive.org',      desc: 'Thousands of free, legal, high-quality downloads' },
    { name: 'Jamendo',              url: 'https://www.jamendo.com',           desc: 'Free music from independent artists under Creative Commons' },
    { name: 'Bandcamp',             url: 'https://bandcamp.com',              desc: 'Many artists offer free or pay-what-you-want downloads' },
    { name: 'Internet Archive',     url: 'https://archive.org/details/audio', desc: 'Massive collection of public domain and free music' },
  ];

  // ---- Artist database ----
  const artistDB = {
    'wizkid': {
      full: 'Ayodeji Ibrahim Balogun', origin: 'Lagos, Nigeria',
      genre: 'Afrobeats, Afropop, R&B', active: '2006–present',
      bio: 'Wizkid rose to fame with "Holla at Your Boy" in 2010 and became a global superstar after collaborating with Drake on "One Dance" (2016), which hit #1 in over 15 countries. He is one of Africa\'s biggest music exports and a pioneer of the Afrobeats sound worldwide.',
      hits: ['Essence', 'Come Closer', 'One Dance', 'Ojuelegba', 'Fever', 'Joro', 'Smile', 'Blessed'],
      awards: ['Grammy nomination', 'BET Award', 'MTV EMA', 'MOBO Award'],
      similar: ['Burna Boy', 'Davido', 'Tems', 'Rema'],
    },
    'burna boy': {
      full: 'Damini Ebunoluwa Ogulu', origin: 'Port Harcourt, Nigeria',
      genre: 'Afrobeats, Afrofusion, Reggae, Dancehall', active: '2010–present',
      bio: 'Burna Boy is a Grammy Award-winning Nigerian artist known for blending Afrobeats with reggae, dancehall, and R&B. His album "Twice as Tall" won the Grammy for Best Global Music Album in 2021. He calls his sound "Afrofusion".',
      hits: ['Last Last', 'Ye', 'On the Low', 'Location', 'Anybody', 'Way Too Big', 'Kilometre'],
      awards: ['Grammy Award (Best Global Music Album 2021)', 'BET Award', 'MTV EMA'],
      similar: ['Wizkid', 'Davido', 'Tems', 'Omah Lay'],
    },
    'davido': {
      full: 'David Adedeji Adeleke', origin: 'Atlanta, USA / Lagos, Nigeria',
      genre: 'Afrobeats, Afropop', active: '2011–present',
      bio: 'Davido is one of the most successful Afrobeats artists of all time. Born in Atlanta and raised in Lagos, he broke through with "Dami Duro" in 2011. Known for his energetic performances and massive collaborations.',
      hits: ['Fall', 'Assurance', 'If', 'FEM', 'Risky', 'Jowo', 'Stand Strong'],
      awards: ['BET Award', 'MTV EMA', 'MOBO Award'],
      similar: ['Wizkid', 'Burna Boy', 'Tekno', 'Mr Eazi'],
    },
    'rema': {
      full: 'Divine Ikubor', origin: 'Benin City, Nigeria',
      genre: 'Afrobeats, Afropop, Trap', active: '2019–present',
      bio: 'Rema is a young Nigerian superstar who blends Afrobeats with trap and Indian music influences. His song "Calm Down" became a global phenomenon after a remix with Selena Gomez reached the top 10 in multiple countries.',
      hits: ['Calm Down', 'Dumebi', 'Iron Man', 'Bounce', 'Soundgasm', 'Charm'],
      awards: ['BET Award', 'Headies Award'],
      similar: ['Wizkid', 'Omah Lay', 'Fireboy DML', 'Tems'],
    },
    'tems': {
      full: 'Temilade Openiyi', origin: 'Lagos, Nigeria',
      genre: 'Afrobeats, R&B, Soul', active: '2018–present',
      bio: 'Tems is a Nigerian singer-songwriter who gained international recognition after featuring on Wizkid\'s "Essence". She became the first African woman to reach #1 on the Billboard Afrobeats chart and has collaborated with Drake, Future, and Beyoncé.',
      hits: ['Free Mind', 'Essence (with Wizkid)', 'Higher', 'Me & U', 'No Woman No Cry'],
      awards: ['Grammy Award', 'BET Award', 'Billboard Music Award'],
      similar: ['Wizkid', 'Simi', 'Asa', 'Omah Lay'],
    },
    'omah lay': {
      full: 'Stanley Omah Didia', origin: 'Port Harcourt, Nigeria',
      genre: 'Afrobeats, R&B, Soul', active: '2019–present',
      bio: 'Omah Lay is a Nigerian singer and songwriter known for his soulful voice and emotional lyrics. He broke out with "You" in 2020 and quickly became one of the most streamed African artists globally.',
      hits: ['You', 'Bad Influence', 'Godly', 'Understand', 'Soso', 'Attention'],
      awards: ['BET Award', 'Headies Award'],
      similar: ['Tems', 'Rema', 'Fireboy DML', 'Burna Boy'],
    },
    'fireboy dml': {
      full: 'Adedamola Adefolahan', origin: 'Abeokuta, Nigeria',
      genre: 'Afropop, R&B', active: '2018–present',
      bio: 'Fireboy DML is a Nigerian singer known for his smooth vocals and emotional songwriting. He gained massive recognition with "Peru" which became a global hit after a remix with Ed Sheeran.',
      hits: ['Peru', 'Jealous', 'Scatter', 'Champion', 'Vibration', 'Bandana'],
      awards: ['Headies Award', 'AFRIMA Award'],
      similar: ['Omah Lay', 'Rema', 'Tems', 'Joeboy'],
    },
    'drake': {
      full: 'Aubrey Drake Graham', origin: 'Toronto, Canada',
      genre: 'Hip Hop, R&B, Pop Rap', active: '2001–present',
      bio: 'Drake is one of the best-selling music artists of all time. He started as an actor on Degrassi before becoming a rapper. Known for blending rap and R&B, he has broken numerous streaming records and dominated charts for over a decade.',
      hits: ['God\'s Plan', 'One Dance', 'Hotline Bling', 'In My Feelings', 'Started From the Bottom', 'Passionfruit'],
      awards: ['4 Grammy Awards', 'Multiple Billboard Music Awards', 'BET Awards'],
      similar: ['The Weeknd', 'J. Cole', 'Kendrick Lamar', 'Travis Scott'],
    },
    'the weeknd': {
      full: 'Abel Makkonen Tesfaye', origin: 'Toronto, Canada',
      genre: 'R&B, Pop, Synth-pop', active: '2010–present',
      bio: 'The Weeknd is a Canadian singer known for his dark, atmospheric R&B sound. His album "After Hours" produced the massive hit "Blinding Lights", which became one of the best-charting singles in Billboard Hot 100 history.',
      hits: ['Blinding Lights', 'Save Your Tears', 'Starboy', 'Can\'t Feel My Face', 'The Hills', 'Earned It'],
      awards: ['3 Grammy Awards', 'American Music Awards', 'Billboard Music Awards'],
      similar: ['Drake', 'Frank Ocean', 'Miguel', 'SZA'],
    },
    'kendrick lamar': {
      full: 'Kendrick Lamar Duckworth', origin: 'Compton, California, USA',
      genre: 'Hip Hop, Conscious Rap', active: '2003–present',
      bio: 'Kendrick Lamar is widely regarded as one of the greatest rappers of all time. He became the first non-classical, non-jazz musician to win the Pulitzer Prize for Music for his album "DAMN." in 2018.',
      hits: ['HUMBLE.', 'Alright', 'Money Trees', 'Swimming Pools', 'DNA.', 'Not Like Us'],
      awards: ['13 Grammy Awards', 'Pulitzer Prize for Music', 'BET Award'],
      similar: ['J. Cole', 'Drake', 'Tyler the Creator', 'Jay-Z'],
    },
    'j. cole': {
      full: 'Jermaine Lamarr Cole', origin: 'Fayetteville, North Carolina, USA',
      genre: 'Hip Hop, Conscious Rap', active: '2007–present',
      bio: 'J. Cole is known for his introspective lyrics and self-produced albums. He is one of the few artists to release platinum albums with no features. His album "2014 Forest Hills Drive" went platinum with zero guest appearances.',
      hits: ['No Role Modelz', 'Love Yourz', 'Middle Child', 'Power Trip', 'Crooked Smile'],
      awards: ['Grammy Award', 'BET Award', 'MTV VMA'],
      similar: ['Kendrick Lamar', 'Drake', 'Big Sean', 'Wale'],
    },
    'beyonce': {
      full: 'Beyoncé Giselle Knowles-Carter', origin: 'Houston, Texas, USA',
      genre: 'R&B, Pop, Soul, Dance', active: '1997–present',
      bio: 'Beyoncé is one of the most awarded and influential artists in music history. She started in Destiny\'s Child before launching a legendary solo career. Her visual albums "Lemonade" and "Renaissance" are considered masterpieces.',
      hits: ['Crazy in Love', 'Halo', 'Single Ladies', 'Formation', 'Irreplaceable', 'Love On Top'],
      awards: ['32 Grammy Awards (most by any artist)', 'MTV VMA', 'BET Award'],
      similar: ['Rihanna', 'Alicia Keys', 'Mary J. Blige', 'Tems'],
    },
    'rihanna': {
      full: 'Robyn Rihanna Fenty', origin: 'Barbados',
      genre: 'R&B, Pop, Dancehall', active: '2003–present',
      bio: 'Rihanna is one of the best-selling music artists of all time with over 250 million records sold. Born in Barbados, she moved to the US at 16 and quickly became a global superstar. She is also a successful businesswoman with Fenty Beauty.',
      hits: ['Umbrella', 'We Found Love', 'Diamonds', 'Work', 'Stay', 'Needed Me'],
      awards: ['9 Grammy Awards', 'MTV VMA', 'BET Award'],
      similar: ['Beyoncé', 'Nicki Minaj', 'Ciara', 'Tems'],
    },
    'bob marley': {
      full: 'Robert Nesta Marley', origin: 'Nine Mile, Jamaica',
      genre: 'Reggae, Ska, Rocksteady', active: '1962–1981',
      bio: 'Bob Marley is the most iconic reggae artist of all time. He brought reggae music to the world stage and used his music to spread messages of love, unity, and resistance. His album "Legend" is one of the best-selling albums ever.',
      hits: ['No Woman No Cry', 'One Love', 'Redemption Song', 'Buffalo Soldier', 'Three Little Birds', 'Is This Love'],
      awards: ['Grammy Lifetime Achievement Award', 'Rock and Roll Hall of Fame'],
      similar: ['Peter Tosh', 'Damian Marley', 'Chronixx', 'Protoje'],
    },
    'sarkodie': {
      full: 'Michael Owusu Addo', origin: 'Tema, Ghana',
      genre: 'Hiplife, Hip Hop, Afrobeats', active: '2006–present',
      bio: 'Sarkodie is Ghana\'s most celebrated rapper and one of Africa\'s biggest hip hop artists. Known for his rapid-fire delivery in Twi and English, he has won multiple BET Awards and is considered the greatest Ghanaian rapper of all time.',
      hits: ['Adonai', 'Biibi Ba', 'Trumpet', 'Illuminati', 'Saara', 'Non Living Thing'],
      awards: ['BET Award for Best International Flow', 'Ghana Music Awards'],
      similar: ['Stonebwoy', 'Shatta Wale', 'Black Sherif', 'Medikal'],
    },
    'black sherif': {
      full: 'Mohammed Ismail Sherif', origin: 'Konongo, Ghana',
      genre: 'Afrobeats, Hiplife, Drill', active: '2020–present',
      bio: 'Black Sherif is a young Ghanaian artist who blends Afrobeats, hiplife, and drill. He rose to fame with "Second Sermon" which became a viral hit across Africa. His raw, emotional storytelling has made him one of Ghana\'s most exciting new voices.',
      hits: ['Second Sermon', 'Kwaku the Traveller', 'Oh Paradise', 'Soja', 'Cry for Me'],
      awards: ['Ghana Music Awards', 'Soundcity MVP Award'],
      similar: ['Sarkodie', 'Stonebwoy', 'Omah Lay', 'Rema'],
    },
    'stonebwoy': {
      full: 'Livingstone Etse Satekla', origin: 'Ashaiman, Ghana',
      genre: 'Reggae, Dancehall, Afrobeats', active: '2010–present',
      bio: 'Stonebwoy is Ghana\'s leading reggae and dancehall artist. He has won multiple BET Awards and is known for his powerful live performances and socially conscious lyrics.',
      hits: ['Epistles of Mama', 'Nominate', 'Everlasting', 'Activate', 'Putuu'],
      awards: ['BET Award for Best International Flow', 'Ghana Music Awards'],
      similar: ['Sarkodie', 'Shatta Wale', 'Chronixx', 'Protoje'],
    },
    'shatta wale': {
      full: 'Charles Nii Armah Mensah Jr.', origin: 'Accra, Ghana',
      genre: 'Dancehall, Afrobeats', active: '2004–present',
      bio: 'Shatta Wale is one of Ghana\'s most popular and controversial artists. Known as the "Dancehall King of Africa", he has a massive fanbase called the Shatta Movement and has collaborated with Beyoncé on the "Lion King: The Gift" album.',
      hits: ['My Level', 'Gringo', 'Melissa', 'Taking Over', 'Already (with Beyoncé)'],
      awards: ['Ghana Music Awards', 'VGMA'],
      similar: ['Stonebwoy', 'Sarkodie', 'Medikal', 'Kidi'],
    },
  };

  // ---- Song knowledge base ----
  const songDB = {
    'essence': { artist: 'Wizkid ft. Tems', year: 2020, album: 'Made in Lagos', info: 'Essence is a smooth Afrobeats love song that became a global hit. The Justin Bieber remix pushed it to #1 on the Billboard Afrobeats chart and introduced Wizkid and Tems to mainstream Western audiences.' },
    'calm down': { artist: 'Rema', year: 2022, album: 'Rave & Roses', info: 'Calm Down became a worldwide phenomenon. The Selena Gomez remix reached the top 10 in multiple countries and made Rema the first Nigerian artist to reach 1 billion streams on Spotify.' },
    'last last': { artist: 'Burna Boy', year: 2022, album: 'Love, Damini', info: 'Last Last samples Toni Braxton\'s "He Wasn\'t Man Enough" and became Burna Boy\'s biggest hit. It was inspired by his breakup with Stefflon Don and resonated deeply with fans worldwide.' },
    'blinding lights': { artist: 'The Weeknd', year: 2019, album: 'After Hours', info: 'Blinding Lights is one of the greatest pop songs ever made. It spent 57 weeks in the top 10 of the Billboard Hot 100 — the longest run in chart history — and has a retro 80s synth-pop sound.' },
    "god's plan": { artist: 'Drake', year: 2018, album: 'Scorpion', info: "God's Plan spent 11 weeks at #1 on the Billboard Hot 100. The music video showed Drake giving away the entire $996,631 budget to people in Miami, which went viral worldwide." },
    'second sermon': { artist: 'Black Sherif', year: 2021, album: 'The Villain I Never Was', info: 'Second Sermon went viral across Africa and launched Black Sherif to stardom. The Burna Boy remix brought it to an even wider audience. The song blends drill, hiplife, and raw emotional storytelling.' },
    'kwaku the traveller': { artist: 'Black Sherif', year: 2022, album: 'The Villain I Never Was', info: 'Kwaku the Traveller is Black Sherif\'s breakthrough international hit. It tells the story of a young man navigating life\'s struggles and became the most Shazamed song in Ghana.' },
    'one dance': { artist: 'Drake ft. Wizkid & Kyla', year: 2016, album: 'Views', info: 'One Dance was Drake\'s first #1 single in the US and UK. It introduced Afrobeats rhythms to mainstream pop and helped launch Wizkid to global fame. It spent 10 weeks at #1 in the UK.' },
    'humble': { artist: 'Kendrick Lamar', year: 2017, album: 'DAMN.', info: 'HUMBLE. is one of Kendrick\'s most commercially successful songs. The music video directed by Dave Meyers won multiple VMAs. The beat by Mike Will Made-It is instantly recognizable.' },
    'no woman no cry': { artist: 'Bob Marley', year: 1974, album: 'Natty Dread', info: 'No Woman No Cry is one of Bob Marley\'s most beloved songs. Despite the title, the song is actually a message of comfort and hope, telling a woman not to cry because things will be alright.' },
    'peru': { artist: 'Fireboy DML ft. Ed Sheeran', year: 2021, album: 'Apollo', info: 'Peru was originally released in 2021 and became a massive hit in Africa. The Ed Sheeran remix took it global, reaching the top 10 in the UK and introducing Fireboy DML to international audiences.' },
  };

  // ---- Genre recommendations ----
  const genreDB = {
    'afrobeats': { artists: ['Wizkid', 'Burna Boy', 'Davido', 'Rema', 'Tems', 'Omah Lay', 'Fireboy DML', 'Joeboy'], desc: 'Afrobeats originated in West Africa and blends African rhythms with hip hop, R&B, and dancehall.' },
    'hip hop': { artists: ['Kendrick Lamar', 'J. Cole', 'Drake', 'Tyler the Creator', 'Travis Scott', 'Lil Baby'], desc: 'Hip hop originated in the Bronx, New York in the 1970s and is now the most streamed genre globally.' },
    'rap': { artists: ['Drake', 'Travis Scott', 'Lil Baby', 'Roddy Ricch', 'Polo G', 'NBA YoungBoy'], desc: 'Modern rap blends trap beats with melodic hooks and storytelling.' },
    'r&b': { artists: ['SZA', 'Frank Ocean', 'H.E.R.', 'Daniel Caesar', 'Jhené Aiko', 'Brent Faiyaz'], desc: 'R&B (Rhythm and Blues) is a genre rooted in African American music combining soul, funk, and pop.' },
    'pop': { artists: ['The Weeknd', 'Dua Lipa', 'Harry Styles', 'Olivia Rodrigo', 'Taylor Swift', 'Billie Eilish'], desc: 'Pop music is designed for wide appeal with catchy melodies and polished production.' },
    'rock': { artists: ['Arctic Monkeys', 'Tame Impala', 'The 1975', 'Radiohead', 'Foo Fighters', 'Coldplay'], desc: 'Rock music is built around electric guitars, bass, and drums with a wide range of sub-genres.' },
    'jazz': { artists: ['Miles Davis', 'John Coltrane', 'Norah Jones', 'Kamasi Washington', 'Esperanza Spalding'], desc: 'Jazz originated in New Orleans in the early 20th century and is known for improvisation and complex harmonies.' },
    'reggae': { artists: ['Bob Marley', 'Damian Marley', 'Chronixx', 'Protoje', 'Stonebwoy', 'Koffee'], desc: 'Reggae originated in Jamaica in the late 1960s and is known for its offbeat rhythms and social messages.' },
    'hiplife': { artists: ['Sarkodie', 'Stonebwoy', 'Shatta Wale', 'Black Sherif', 'Medikal', 'Kidi'], desc: 'Hiplife is a Ghanaian genre that blends hip hop with highlife music, often featuring Twi lyrics.' },
    'electronic': { artists: ['Daft Punk', 'Disclosure', 'Four Tet', 'Bonobo', 'Flume', 'Kaytranada'], desc: 'Electronic music uses synthesizers, drum machines, and digital production to create a wide range of sounds.' },
  };

  // ---- Helpers ----
  function findArtist(msg) {
    const lower = msg.toLowerCase();
    for (const [key, data] of Object.entries(artistDB)) {
      if (lower.includes(key)) return { key, ...data };
    }
    return null;
  }

  function findSong(msg) {
    const lower = msg.toLowerCase();
    for (const [key, data] of Object.entries(songDB)) {
      if (lower.includes(key)) return { key, ...data };
    }
    return null;
  }

  function findGenre(msg) {
    const lower = msg.toLowerCase();
    for (const [key, data] of Object.entries(genreDB)) {
      if (lower.includes(key)) return { key, ...data };
    }
    return null;
  }

  function extractSongName(msg) {
    const patterns = [
      /download\s+["']?(.+?)["']?\s*(?:song|track|music|mp3)?$/i,
      /where.*(?:find|get|download)\s+["']?(.+?)["']?$/i,
      /["'](.+?)["']/,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m && m[1] && m[1].length > 1) return m[1].trim();
    }
    return null;
  }

  function buildArtistResponse(artist) {
    return `<b>${artist.full}</b><br>
<i>${artist.origin} · ${artist.genre}</i><br><br>
${artist.bio}<br><br>
<b>Popular songs:</b><ul>${artist.hits.map(h => `<li>${h}</li>`).join('')}</ul>
<b>Similar artists:</b> ${artist.similar.join(', ')}<br><br>
<b>Awards:</b> ${artist.awards.join(', ')}`;
  }

  function buildSongResponse(song) {
    return `<b>${song.key.charAt(0).toUpperCase() + song.key.slice(1)}</b> — ${song.artist} (${song.year})<br>
<i>Album: ${song.album}</i><br><br>
${song.info}<br><br>
<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(song.key + ' ' + song.artist)}" target="_blank">Search on YouTube</a>`;
  }

  function buildDownloadResponse(songName) {
    const intro = songName
      ? `Here are the best places to find and download <b>"${songName}"</b>:`
      : `Here are the best free & legal places to download music:`;
    const list = downloadSources.slice(0, 6).map(s =>
      `<li><a href="${s.url}" target="_blank">${s.name}</a> — ${s.desc}</li>`
    ).join('');
    return `${intro}<br><ul>${list}</ul>
<b>Tip:</b> Use <a href="https://github.com/yt-dlp/yt-dlp" target="_blank">yt-dlp</a> to download from YouTube for free.`;
  }

  function buildGenreResponse(genre) {
    return `<b>${genre.key.charAt(0).toUpperCase() + genre.key.slice(1)}</b><br><br>
${genre.desc}<br><br>
<b>Artists to check out:</b><ul>${genre.artists.map(a => `<li>${a}</li>`).join('')}</ul>
Find their music on <a href="https://soundcloud.com" target="_blank">SoundCloud</a> or <a href="https://www.youtube.com" target="_blank">YouTube</a>.`;
  }

  function processMessage(msg) {
    const lower = msg.toLowerCase();

    // Currently playing track context
    if (lower.match(/\b(current|playing|now playing|what.*playing|this song|this track)\b/)) {
      const song = Player.getCurrentSong();
      if (!song) return `Nothing is playing right now. Add songs from the Library tab.`;
      let resp = `Currently playing: <b>${song.name}</b> by <b>${song.artist || 'Unknown Artist'}</b>`;
      // Try to find more info
      const artistInfo = findArtist(song.artist || '');
      const songInfo   = findSong(song.name || '');
      if (songInfo) resp += `<br><br>${buildSongResponse(songInfo)}`;
      else if (artistInfo) resp += `<br><br>${buildArtistResponse(artistInfo)}`;
      return resp;
    }

    // Artist info
    const artist = findArtist(lower);
    if (artist && lower.match(/\b(who is|tell me about|info|about|biography|bio|artist|singer|rapper)\b/)) {
      return buildArtistResponse(artist);
    }

    // Song info
    const song = findSong(lower);
    if (song && lower.match(/\b(tell me|about|info|what is|song|track|meaning|story)\b/)) {
      return buildSongResponse(song);
    }

    // Ask AI about track (from three-dot menu)
    if (lower.match(/tell me about the song|about.*by/)) {
      const songMatch = findSong(lower);
      const artistMatch = findArtist(lower);
      if (songMatch) return buildSongResponse(songMatch);
      if (artistMatch) return buildArtistResponse(artistMatch);
      // Extract what we can
      const nameMatch = msg.match(/song "(.+?)"/i) || msg.match(/about (.+?) by/i);
      const artMatch  = msg.match(/by (.+?)$/i);
      if (nameMatch || artMatch) {
        return `I don't have specific info on that track yet, but you can search for <b>${nameMatch ? nameMatch[1] : ''}</b> on <a href="https://www.youtube.com" target="_blank">YouTube</a> or <a href="https://soundcloud.com" target="_blank">SoundCloud</a> to learn more.`;
      }
    }

    // Genre recommendations
    const genre = findGenre(lower);
    if (genre && lower.match(/\b(recommend|suggest|genre|similar|like|artists|music)\b/)) {
      return buildGenreResponse(genre);
    }

    // Download
    if (lower.match(/\b(download|where.*get|find.*song|get.*song)\b/)) {
      return buildDownloadResponse(extractSongName(msg));
    }

    // yt-dlp
    if (lower.match(/yt-dlp|ytdlp|youtube.*download/)) {
      return `Here's how to download a song using <a href="https://github.com/yt-dlp/yt-dlp" target="_blank">yt-dlp</a>:<br><br>
1. Install: <code>pip install yt-dlp</code><br>
2. Download audio: <code>yt-dlp -x --audio-format mp3 "YOUTUBE_URL"</code><br><br>
Then add the MP3 to your Groovix library.`;
    }

    // Library info
    if (lower.match(/\b(how many|library|songs|count)\b/)) {
      const count = Player.getSongs().length;
      return count > 0
        ? `You have <b>${count}</b> song${count !== 1 ? 's' : ''} in your library.`
        : `Your library is empty. Tap the folder icon in the Library tab to add music.`;
    }

    // Free music
    if (lower.match(/\b(free music|legal|copyright free|royalty free)\b/)) {
      const list = downloadSources.map(s => `<li><a href="${s.url}" target="_blank">${s.name}</a> — ${s.desc}</li>`).join('');
      return `Here are all the free & legal music sources I know:<br><ul>${list}</ul>`;
    }

    // Help / greeting
    if (lower.match(/\b(hello|hi|hey|help|what can you do)\b/)) {
      return `Hey! I'm your Groovix AI assistant. I can:<br><ul>
<li>Tell you about artists (e.g. "Who is Wizkid?")</li>
<li>Give info on songs (e.g. "Tell me about Essence")</li>
<li>Recommend music by genre (e.g. "Suggest afrobeats artists")</li>
<li>Find where to download songs</li>
<li>Answer questions about the current track</li>
</ul>Just ask!`;
    }

    // Fallback — try artist or song match without strict keyword
    if (artist) return buildArtistResponse(artist);
    if (song)   return buildSongResponse(song);
    if (genre)  return buildGenreResponse(genre);

    return `I'm not sure about that. Try asking me about an artist, a song, or a genre — like "Tell me about Burna Boy" or "What is Calm Down about?"`;
  }

  // ---- Chat UI ----
  function appendMessage(role, html) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = `
      <div class="chat-avatar"><i class="fa ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i></div>
      <div class="chat-bubble">${html}</div>
    `;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.id = 'typingIndicator';
    div.innerHTML = `<div class="chat-avatar"><i class="fa fa-robot"></i></div>
      <div class="chat-bubble typing-indicator"><span></span><span></span><span></span></div>`;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  // Build context about current song for Gemini
  function getCurrentContext() {
    const song = Player.getCurrentSong();
    if (!song) return '';
    return `\n\n[Context: The user is currently playing "${song.name}" by "${song.artist || 'Unknown Artist'}" in the Groovix app.]`;
  }

  // Format Gemini plain text to safe HTML
  function formatResponse(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.+?)\*/g, '<i>$1</i>');
  }

  // Call Gemini API
  async function askGemini(userMsg) {
    const context = getCurrentContext();
    const fullPrompt = SYSTEM_PROMPT + context + '\n\nUser: ' + userMsg;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
      })
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not get a response.';
  }

  // Offline fallback for when no API key or no internet
  function offlineFallback(msg) {
    return processMessage(msg);
  }

  async function send() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = '';
    appendMessage('user', msg);
    showTyping();

    // If no API key set, use local knowledge base
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      setTimeout(() => {
        removeTyping();
        appendMessage('ai', offlineFallback(msg));
      }, 500);
      return;
    }

    try {
      const reply = await askGemini(msg);
      removeTyping();
      appendMessage('ai', formatResponse(reply));
    } catch (err) {
      removeTyping();
      // Fall back to local knowledge base on error
      appendMessage('ai', offlineFallback(msg));
    }
  }

  sendBtn.addEventListener('click', send);
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  setTimeout(() => {
    const hasKey = GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY';
    appendMessage('ai', hasKey
      ? `Hey! I'm your Groovix AI — powered by Gemini. Ask me anything about any artist, song, album, or genre worldwide. What's on your mind?`
      : `Hey! I'm your Groovix AI assistant. Ask me about artists, songs, genres, or where to download music. To unlock full AI power, add your free Gemini API key in ai.js.`
    );
  }, 300);

  return { send, appendMessage };
})();
