
var dataHolder = {};

onmessage = function (e) {
  var taskName = e.data[0];
  var data = e.data[1];
  var config = e.data[2];

  if (taskName === 'load_new_book') {

    config.bookSequence.forEach(function (bookName) {
      var chunkNumber = data[bookName + '_chunk'];
      dataHolder[bookName] = {
        event_name: taskName,
        book_id: data[bookName + '_id'],
        text: [],
        pageHistory: {},
        dispatching: 0,
        total: 0,
        start_chunk: chunkNumber - config.backward_chunk_count,     // chunk_number cannot be less than 1 (as ms starts from 1)
        end_chunk: chunkNumber + config.forward_chunk_count
      };

      createRequestQueue(bookName, config);
    });

  } else if (taskName === 'load_backward_book' || taskName === 'load_forward_book') {
    var requestArgs = e.data[3];
    var bookName = requestArgs.bookName;
    var bookData = dataHolder[bookName];
    bookData.event_name = taskName;
    bookData.start_chunk = requestArgs.start_chunk;
    bookData.end_chunk = requestArgs.end_chunk;
    createRequestQueue(bookName, config);
  }

  function createRequestQueue(bookName, config) {
    var bookData = dataHolder[bookName];
    if (bookData.start_chunk < 1) {
      bookData.start_chunk = 1;
    }
    var startingPage = calcPageNumber(bookData.start_chunk, config.page_chunk_count);
    var endingPage = calcPageNumber(bookData.end_chunk, config.page_chunk_count);

    bookData.total = (endingPage - startingPage) / config.page_chunk_count + 1;
    for (var pageIndex = 0; pageIndex < bookData.total; pageIndex++) {
      var pageNumber = startingPage + config.page_chunk_count * pageIndex;
      if (bookData.pageHistory[pageNumber]) {
        bookResponse(bookData.pageHistory[pageNumber], bookName);
      } else {
        loadBook(bookName, pageNumber, pageIndex, config);
      }
    }
  }
}
function bookResponse(text, bookName) {
  var status = 'pending';
  var bookData = dataHolder[bookName];
  var jsonChunks = parseText(text, bookName);

  if (bookData.dispatching === bookData.total) {
    dataHolder[bookName].text = [];
    status = 'complete';
  }
  postMessage([
    bookData.event_name, status, jsonChunks, bookName,
    [bookData.start_chunk, bookData.end_chunk]
  ]);
}
function bookOnLoad(text, bookName, pageIndex) {
  var bookData = dataHolder[bookName];

  bookData.text[pageIndex] = text;
  if (pageIndex <= bookData.dispatching) {
    bookData.text.slice(bookData.dispatching)
      .some(function (text) {
        if (text === undefined) {
          return true;
        }
        bookData.dispatching++;
        bookResponse(text, bookName);
      });
  }
}
function loadBook(bookName, pageNumber, pageIndex, config) {
  var bookData = dataHolder[bookName];

  var url = config.book_content_url;
  url = url.replace('{book_id}', bookData.book_id);
  url = url.replace('{page_string}', prefixString(pageNumber, config.page_string_format));
  var xhr = new XMLHttpRequest();
  console.log(url);
  xhr.open('GET', url, true);
  xhr.onload = function (e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        bookData.pageHistory[pageNumber] = xhr.responseText;
        bookOnLoad(xhr.responseText, bookName, pageIndex);
      } else {
        console.error(xhr.statusText);
      }
    }
  };
  xhr.onerror = function (e) {
    console.error(xhr.statusText);
  };
  xhr.send(null);
}

function prefixString(number, format) {
  return (format + number.toString()).slice(-format.length);
}
function calcPageNumber(chunkNumber, chunkCount) {
  return chunkNumber + chunkCount - chunkNumber % chunkCount;
}
function parseText(pageStr, bookName) {
  var bookData = dataHolder[bookName];
  pageStr = filterBookNoise(pageStr);
  var data = {};
  pageStr.split('\n').forEach(function (row) {
    if (row) {
      row = row.split('\t');
      var chunkNumber = Number(row[0].replace('ms', ''));
      if (chunkNumber >= bookData.start_chunk && chunkNumber <= bookData.end_chunk) {
        data[chunkNumber] = row[1];
      }
    }
  });
  return data;
}
function filterBookNoise(text) {
  text = text.replace(/\n~~/g, ' ');
  text = text.replace(/ +/g, ' ');
  text = text.replace(/### \|+/g, function (match) {
    return '#' + match.slice(4).replace(/\|/g, '#');
  });
  return text;
}
