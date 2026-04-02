// ---- AI Assistant ----
const AI = (() => {
  const chatWindow = document.getElementById('chatWindow');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');

  // Free/legal download sources (no streaming apps)
  const downloadSources = [
    { name: 'YouTube (via yt-dlp)', url: 'https://github.com/yt-dlp/yt-dlp', desc: 'Download audio from YouTube using the free open-source tool yt-dlp' },
    { name: 'SoundCloud', url: 'https://soundcloud.com', desc: 'Many artists offer free downloads directly on their SoundCloud pages' },
    { name: 'Free Music Archive (FMA)', url: 'https://freemusicarchive.org', desc: 'Thousands of free, legal, high-quality music downloads' },
    { name: 'Jamendo', url: 'https://www.jamendo.com', desc: 'Free music from independent artists, licensed under Creative Commons' },
    { name: 'ccMixter', url: 'https://ccmixter.org', desc: 'Creative Commons licensed music, free to download and remix' },
    { name: 'Bandcamp', url: 'https://bandcamp.com', desc: 'Many artists offer free or pay-what-you-want downloads' },
    { name: 'Internet Archive', url: 'https://archive.org/details/audio', desc: 'Massive collection of public domain and free music' },
    { name: 'Musopen', url: 'https://musopen.org', desc: 'Free classical music recordings and sheet music' },
    { name: 'NoiseTrade', url: 'https://noisetrade.com', desc: 'Artists share free music in exchange for your email' },
    { name: 'Looperman', url: 'https://www.looperman.com', desc: 'Free loops, acapellas and samples from artists worldwide' },
  ];

  // Knowledge base for common music questions
  const knowledgeBase = [
    {
      keywords: ['download', 'where', 'get', 'find', 'source'],
      handler: (msg) => {
        const song = extractSongName(msg);
        return buildDownloadResponse(song);
      }
    },
    {
      keywords: ['yt-dlp', 'ytdlp', 'youtube download', 'download youtube'],
      handler: () => `Here's how to download a song using <a href="https://github.com/yt-dlp/yt-dlp" target="_blank">yt-dlp</a>:<br><br>
1. Install it: <code>pip install yt-dlp</code><br>
2. Download audio only:<br>
<code>yt-dlp -x --audio-format mp3 "https://youtube.com/watch?v=..."</code><br><br>
This saves the song as an MP3 you can then add to your library here.`
    },
    {
      keywords: ['recommend', 'suggestion', 'similar', 'like', 'genre'],
      handler: (msg) => buildRecommendationResponse(msg)
    },
    {
      keywords: ['add', 'import', 'load', 'upload', 'how to add'],
      handler: () => `To add songs to your library:<br><ul>
<li>Go to the <b>Library</b> tab</li>
<li>Click <b>+ Add Songs</b></li>
<li>Select one or more audio files (MP3, WAV, FLAC, etc.)</li>
</ul>
Your songs will appear in the list and you can play them instantly.`
    },
    {
      keywords: ['format', 'mp3', 'flac', 'wav', 'ogg', 'supported'],
      handler: () => `This player supports any audio format your browser can handle, including:<br><ul>
<li>MP3 — most common, great compatibility</li>
<li>WAV — uncompressed, high quality</li>
<li>FLAC — lossless compression</li>
<li>OGG — open format, good quality</li>
<li>AAC / M4A — Apple's format</li>
</ul>`
    },
    {
      keywords: ['shuffle', 'repeat', 'loop', 'controls'],
      handler: () => `Player controls:<br><ul>
<li><b>Shuffle</b> — randomizes playback order</li>
<li><b>Repeat</b> — loops the current song</li>
<li><b>Progress bar</b> — click/drag to seek</li>
<li><b>Volume</b> — drag the volume slider</li>
</ul>`
    },
    {
      keywords: ['free music', 'legal', 'copyright free', 'royalty free'],
      handler: () => buildFreeSourcesResponse()
    },
    {
      keywords: ['hello', 'hi', 'hey', 'sup', 'what can you do', 'help'],
      handler: () => `Hey! I'm your AI music assistant. Here's what I can help with:<br><ul>
<li>Find where to download specific songs</li>
<li>Suggest free & legal music sources</li>
<li>Give genre-based recommendations</li>
<li>Help you use the player features</li>
<li>Answer general music questions</li>
</ul>
Just ask me anything!`
    },
    {
      keywords: ['playing', 'current', 'now playing', 'what song'],
      handler: () => {
        const song = Player.getCurrentSong();
        if (song) return `Currently playing: <b>${song.name}</b> by <b>${song.artist || 'Unknown Artist'}</b>`;
        return `Nothing is playing right now. Head to the Library tab to add and play songs.`;
      }
    },
    {
      keywords: ['library', 'how many', 'songs', 'count'],
      handler: () => {
        const count = Player.getSongs().length;
        return count > 0
          ? `You have <b>${count}</b> song${count !== 1 ? 's' : ''} in your library.`
          : `Your library is empty. Add some songs from the Library tab.`;
      }
    }
  ];

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

  function buildDownloadResponse(songName) {
    const intro = songName
      ? `Here are the best places to find and download <b>"${songName}"</b>:`
      : `Here are the best free & legal places to download music:`;

    const sources = downloadSources.slice(0, 6);
    const list = sources.map(s =>
      `<li><a href="${s.url}" target="_blank">${s.name}</a> — ${s.desc}</li>`
    ).join('');

    return `${intro}<br><ul>${list}</ul><br>
<b>Tip:</b> For YouTube downloads, use <a href="https://github.com/yt-dlp/yt-dlp" target="_blank">yt-dlp</a> — it's free, open-source, and works from the command line.`;
  }

  function buildFreeSourcesResponse() {
    const list = downloadSources.map(s =>
      `<li><a href="${s.url}" target="_blank">${s.name}</a> — ${s.desc}</li>`
    ).join('');
    return `Here are all the free & legal music download sources I know:<br><ul>${list}</ul>`;
  }

  function buildRecommendationResponse(msg) {
    const genres = {
      'hip hop': ['Kendrick Lamar', 'J. Cole', 'Tyler the Creator', 'Denzel Curry'],
      'rap': ['Drake', 'Travis Scott', 'Lil Baby', 'Roddy Ricch'],
      'afrobeats': ['Burna Boy', 'Wizkid', 'Davido', 'Rema', 'Tems'],
      'pop': ['The Weeknd', 'Dua Lipa', 'Harry Styles', 'Olivia Rodrigo'],
      'rnb': ['SZA', 'Frank Ocean', 'H.E.R.', 'Daniel Caesar'],
      'rock': ['Arctic Monkeys', 'Tame Impala', 'The 1975', 'Radiohead'],
      'jazz': ['Miles Davis', 'John Coltrane', 'Norah Jones', 'Kamasi Washington'],
      'classical': ['Beethoven', 'Mozart', 'Chopin', 'Bach'],
      'electronic': ['Daft Punk', 'Disclosure', 'Four Tet', 'Bonobo'],
      'reggae': ['Bob Marley', 'Damian Marley', 'Chronixx', 'Protoje'],
    };

    const msgLower = msg.toLowerCase();
    for (const [genre, artists] of Object.entries(genres)) {
      if (msgLower.includes(genre)) {
        return `Here are some great <b>${genre}</b> artists to check out:<br><ul>
${artists.map(a => `<li>${a}</li>`).join('')}
</ul>
You can find their music on <a href="https://www.youtube.com" target="_blank">YouTube</a>, <a href="https://soundcloud.com" target="_blank">SoundCloud</a>, or <a href="https://bandcamp.com" target="_blank">Bandcamp</a>.`;
      }
    }

    return `I can recommend music by genre. Try asking something like:<br><ul>
<li>"Recommend some afrobeats artists"</li>
<li>"Suggest hip hop songs"</li>
<li>"What are good jazz artists?"</li>
</ul>`;
  }

  function processMessage(msg) {
    const lower = msg.toLowerCase();

    for (const entry of knowledgeBase) {
      if (entry.keywords.some(k => lower.includes(k))) {
        return typeof entry.handler === 'function'
          ? entry.handler(msg)
          : entry.handler;
      }
    }

    // Fallback: generic download suggestion
    if (lower.length > 3) {
      const song = extractSongName(msg) || msg;
      return buildDownloadResponse(song);
    }

    return `I'm not sure about that, but I can help you find music, suggest download sources, or answer questions about the player. What would you like to know?`;
  }

  function appendMessage(role, html) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = `
      <div class="chat-avatar">
        <i class="fa ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
      </div>
      <div class="chat-bubble">${html}</div>
    `;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.id = 'typingIndicator';
    div.innerHTML = `
      <div class="chat-avatar"><i class="fa fa-robot"></i></div>
      <div class="chat-bubble typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  function send() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = '';
    appendMessage('user', msg);
    showTyping();

    // Simulate thinking delay
    setTimeout(() => {
      removeTyping();
      const response = processMessage(msg);
      appendMessage('ai', response);
    }, 600 + Math.random() * 400);
  }

  sendBtn.addEventListener('click', send);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });

  // Welcome message
  setTimeout(() => {
    appendMessage('ai', `Hey! I'm your AI music assistant on Groovix. Ask me where to download songs, get recommendations, or anything music-related. What's on your mind?`);
  }, 300);

  return { send, appendMessage };
})();
