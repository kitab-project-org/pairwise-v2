(function (exports) {
  'use strict';

  var workerConfig = utils.pick([
    'page_chunk_count', 'forward_chunk_count', 'backward_chunk_count',
    'page_string_format', 'book_content_url', 'bookSequence'
  ], {}, config);
  var myWorker = new Worker(config.web_worker_path);
  myWorker.onmessage = workerMessage;

  var selectedMatchData, loadedChunkRange = {};

  exports.loadBackwardContent = loadBackwardContent;
  exports.loadForwardContent = loadForwardContent;
  exports.loadBooks = loadBooks;
  exports.parseMetaDataFile = parseMetaDataFile;
  exports.parseSrtFile = parseSrtFile;

  function pickWorkerData() {
    return utils.pick([
      'book1_id', 'book1_chunk', 'book2_id', 'book2_chunk'
    ], {}, selectedMatchData);
  }
  function loadBackwardContent(bookName) {
    var workerArgs = {
      bookName: bookName,
      start_chunk: loadedChunkRange[bookName][0] - config.load_more_count,
      end_chunk: loadedChunkRange[bookName][0] - 1,
    };

    var workerData = pickWorkerData();
    myWorker.postMessage(['load_backward_book', workerData, workerConfig, workerArgs]);
  }
  function loadForwardContent(bookName) {
    var workerArgs = {
      bookName: bookName,
      start_chunk: loadedChunkRange[bookName][1] + 1,
      end_chunk: loadedChunkRange[bookName][1] + config.load_more_count,
    };

    var workerData = pickWorkerData();
    myWorker.postMessage(['load_forward_book', workerData, workerConfig, workerArgs]);
  }

  function loadBooks(_selectedMatchData) {
    selectedMatchData = _selectedMatchData;

    config.bookSequence.forEach(function (bookName) {
      d3.select('#' + bookName + 'Loader').style('display', null);
      d3.select('#' + bookName + 'Content').style('display', 'none');
      d3.selectAll('.' + bookName + '.loader-btn').style('display', 'none');
      d3.select('#' + bookName + 'Content').html(null);
      d3.select(bookName + 'RawContent').text(null);
    });

    var workerData = pickWorkerData();
    myWorker.postMessage(['load_new_book', workerData, workerConfig]);
  }
  function workerMessage(e) {
    var taskName = e.data[0];
    var status = e.data[1];
    var textObj = e.data[2];
    var bookName = e.data[3];
    var selectedChunkId = selectedMatchData[bookName + '_chunk'];
    var contentNodeD3 = d3.select('#' + bookName + 'Content');
    var prependReferenceD3;

    if (taskName === 'load_new_book') {
      loadedChunkRange[bookName] = e.data[4];
    }
    else if (taskName === 'load_backward_book') {
      loadedChunkRange[bookName][0] = e.data[4][0];
      prependReferenceD3 = contentNodeD3.select('div')
        .attr('class', 'prepend-reference');
    }
    else if (taskName === 'load_forward_book') {
      loadedChunkRange[bookName][1] = e.data[4][1];
    }

    d3.select('#' + bookName + 'Content').style('display', null);

    for (var chunkId in textObj) {
      var chunkText = textObj[chunkId];
      chunkText = parseBookIntoHtml(chunkText);

      var paraLabel;
      var currentPara;
      if (prependReferenceD3) {
        paraLabel = contentNodeD3.insert('div', 'div.prepend-reference');
        currentPara = contentNodeD3.insert('div', 'div.prepend-reference');
      } else {
        paraLabel = contentNodeD3.append('div');
        currentPara = contentNodeD3.append('div');
      }

      paraLabel.attr('class', 'label-chunk')
        .html('ms' + chunkId);
      currentPara.html(chunkText);;

      chunkId = Number(chunkId);
      if (chunkId === selectedChunkId) {
        selectPara(bookName, currentPara, chunkText, paraLabel);
      }
    }
    if (prependReferenceD3) {
      prependReferenceD3.attr('class', null);
    }

    if (status === 'complete') {
      d3.select('#' + bookName + 'Loader').style('display', 'none');
      d3.selectAll('.' + bookName + '.loader-btn').style('display', null);
    }

  }
  function parseBookIntoHtml(text) {
    text = marked(text);
    return text;
  }
  function selectPara(bookName, currentPara, content, paraLabel) {
    var itemText = selectedMatchData[bookName + '_content'];

    paraLabel.attr('class', 'selected-para-label')
    currentPara.attr('class', 'selection-chunk');

    content = content.replace(itemText, '<selection>$&</selection>');
    currentPara.html(parseBookIntoHtml(content));

    var rawContent = '<div class="booktitle">' + bookName
      + ' (ms' + selectedMatchData[bookName + '_chunk'] + ')</div>'
      + selectedMatchData[bookName + '_raw_content'];
    d3.select('#' + bookName + 'RawContent').html(rawContent);

    setTimeout(function () {
      paraLabel.node().scrollIntoView();
      setTimeout(function () {
        var contentNodeD3 = d3.select('#' + bookName + 'Content');
        var selectionNodeD3 = contentNodeD3.select('selection');
        if (!selectionNodeD3.node()) {
          return;
        }

        var scrollTop = selectionNodeD3.property('offsetTop') - contentNodeD3.property('offsetTop');
        contentNodeD3.property('scrollTop', scrollTop);
        utils.selectText(selectionNodeD3.node());
      }, 0);
    }, 0);
  }

  function parseMetaDataFile(fileStr, bookUris) {
    var booksToFind = 2;
    var bookIdHash = {};
    config.bookSequence.forEach(function (bookName) {
      bookIdHash[bookUris[bookName]] = true;
    });

    fileStr.split('\n').some(function (row) {
      if (row) {
        row = row.split('\t');
        var bookId = config.get_meta_data_book_id(row);
        if (bookIdHash[bookId]) {
          bookIdHash[bookId] = config.map_meta_data(row);
          booksToFind--;
        }
      }
      return booksToFind <= 0;
    });

    return config.bookSequence.map(function (bookName) {
      return bookIdHash[bookUris[bookName]];
    });
  }

  function parseSrtFile(fileStr) {
    var data = [];
    fileStr.split('\n').forEach(function (row) {
      if (row) {
        row = row.split('\t');
        data.push(config.map_srt_data(row));
      }
    });
    return data;
  }


})(window.dataLoader = {});