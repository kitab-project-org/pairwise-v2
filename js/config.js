(function (exports) {
  'use strict';

  exports.bookSequence = ['book1', 'book2'];
  exports.srt_data_path = 'data-file/{file_name}';
  exports.meta_data_path = 'data-file/metadata.txt';
  exports.web_worker_path = 'web-worker/data-worker.js';
  exports.book_content_url = 'https://raw.githubusercontent.com/OpenITI/i.mech/master/data/{book_id}-ara1-{page_string}';
  exports.book_github_url = 'https://raw.githubusercontent.com/OpenITI/i.mech/master/data/{book_id}-ara1';
  exports.page_string_format = '00000';
  exports.chunk_size = 300;
  exports.forward_chunk_count = 1;
  exports.backward_chunk_count = 1;
  exports.load_more_count = 2;
  exports.page_chunk_count = 200;

  exports.get_meta_data_book_id = function (d) {
    return d[0];
  };
  exports.map_meta_data = function (d) {
    return {
      book_id: d[0],
      book_author: d[1],
      // author_died: +d[2],
      book_title: d[3],
      book_word_count: Number(d[4]),
      book_chunk_count: Math.ceil(d[4] / exports.chunk_size),
      book_uri: d[5],
      // book_cat: d[6],
      // github_url: d[7]
    };
  };

  exports.map_srt_data = function (d) {
    var book1_ids = utils.extractIdAndMs(d[0]);
    var book2_ids = utils.extractIdAndMs(d[6]);

    return {
      book1_id: book1_ids[0],
      book1_chunk: +book1_ids[1],
      book1_y1: Number(d[2]),
      book1_y2: Number(d[3]),
      book1_raw_content: d[1],
      book1_content: utils.deNormalizeItemText(d[1]),

      book2_id: book2_ids[0],
      book2_chunk: +book2_ids[1],
      book2_y1: Number(d[8]),
      book2_y2: Number(d[9]),
      book2_raw_content: d[7],
      book2_content: utils.deNormalizeItemText(d[7])
    };
  };

})(window.config = {});