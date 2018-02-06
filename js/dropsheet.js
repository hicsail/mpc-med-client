var DropSheet = function DropSheet(opts) {
  if (!opts) {
    opts = {};
  }
  var nullfunc = function () {
  };
  if (!opts.errors) {
    opts.errors = {};
  }
  if (!opts.handle_file) {
    opts.handle_file = handleFile;
  }
  if (!opts.errors.badfile) {
    opts.errors.badfile = nullfunc;
  }
  if (!opts.errors.pending) {
    opts.errors.pending = nullfunc;
  }
  if (!opts.errors.failed) {
    opts.errors.failed = nullfunc;
  }
  if (!opts.errors.large) {
    opts.errors.large = nullfunc;
  }
  if (!opts.on) {
    opts.on = {};
  }
  if (!opts.on.workstart) {
    opts.on.workstart = nullfunc;
  }
  if (!opts.on.workend) {
    opts.on.workend = nullfunc;
  }
  if (!opts.on.sheet) {
    opts.on.sheet = nullfunc;
  }
  if (!opts.on.wb) {
    opts.on.wb = nullfunc;
  }

  var rABS = typeof FileReader !== 'undefined' && typeof FileReader.prototype !== 'undefined' && typeof FileReader.prototype.readAsBinaryString !== 'undefined';
  // var useworker = typeof Worker !== 'undefined';
  var pending = false;

  // Various functions for reading in, parsing.
  function readFile(files) {

    var i, f;
    for (i = 0; i !== files.length; ++i) {
      f = files[i];
      var reader = new FileReader();

      reader.onload = function (e) {
        var data = e.target.result;

        var wb, arr = false;
        var readtype = {type: rABS ? 'binary' : 'base64'};
        if (!rABS) {
          arr = fixData(data);
          data = btoa(arr);
        }

        function doit() {
          try {
            opts.on.workstart();

            wb = XLSX.read(data, readtype);
            opts.on.workend(processWB(wb, 'XLSX'));
          } catch (e) {
            opts.errors.failed(e);
          }
        }

        if (e.target.result.length > 500000) {
          opts.errors.large(e.target.result.length, function (e) {
            if (e) {
              doit();
            }
          });
        } else {
          doit();
        }
      };
      if (rABS) {
        reader.readAsBinaryString(f);
      } else {
        reader.readAsArrayBuffer(f);
      }
    }
  }

  // Helper method for array buffer read-in.
  function fixData(data) {
    var o = '', l = 0, w = 10240;
    for (; l < data.byteLength / w; ++l) {
      o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
    }
    o += String.fromCharCode.apply(null, new Uint8Array(data.slice(o.length)));
    return o;
  }


  // Parses workbook for relevant cells.
  function processWB(wb, type, sheetidx) {

    // Process first ws only by default
    var processed_data = processWSOnly(wb.Sheets[wb.SheetNames[0]]);
    const cols = ['Location', 'Identifier', 'Analyte', 'Value'];

    opts.on.sheet(processed_data, cols);

    if (sheetidx === null) {
      // Check tab names are valid.

      // for (tableidx = 0; tableidx < opts.tables_def.tables.length; tableidx++) {
      //   if (opts.tables_def.tables[tableidx].excel !== undefined) {
      //     current_sheet = opts.tables_def.tables[tableidx].excel[0].sheet;
      //
      //     if (wb.SheetNames.indexOf(current_sheet) === -1) {
      //       // Should override anything that was in HOT originally in case of reupload.
      //       opts.tables[tableidx].clear();
      //       alertify.alert("<img src='/images/cancel.png' alt='Error'>Error!",
      //         "Please make sure spreadsheet tab names match those of original template. Tab '" + current_sheet
      //         + "' not found.");
      //       return;
      //     }
      //   }
      // }
    }

    // // Corresponds to number of tables that are submitted.
    // var checks = [];
    // for (var i = 0; i < opts.tables_def.tables.length; i++) {
    //   if (opts.tables_def.tables[i].submit === null || opts.tables_def.tables[i].submit) {
    //     checks.push(false);
    //   }
    // }

    // // Loop through xlsx worksheets and tables.
    // for (sheetidx = 0; sheetidx < wb.SheetNames.length; sheetidx++) {
    //   current_sheet = wb.Sheets[wb.SheetNames[sheetidx]];
    //   for (tableidx = 0; tableidx < opts.tables_def.tables.length; tableidx++) {
    //
    //     if (opts.tables_def.tables[tableidx].excel !== undefined && opts.tables_def.tables[tableidx].excel !== null && opts.tables_def.tables[tableidx].excel[0] !== null) {
    //       if (opts.tables_def.tables[tableidx].excel[0].sheet === wb.SheetNames[sheetidx]) {
    //         checks[tableidx] = processWS(current_sheet, opts.tables_def.tables[tableidx], opts.tables[tableidx]);
    //
    //       }
    //     }
    //
    //   }
    // }
    //
    // // Assumes all tables updated.
    // if (checks.indexOf(false) === -1) {
    //   alertify.alert('<img src="/images/accept.png" alt="Success">Success',
    //     'The tables below have been populated. Please confirm that your data is accurate and scroll down to answer the multiple choice questions, verify, and submit your data');
    //   return true; // no errors.
    // }

    return false; // There are some errors.
  }

  // Helper functions.

  function arrayMax(array) {
    return array.reduce((a, b) => Math.max(a, b));
  }

  function arrayMin(array) {
    return array.reduce((a, b) => Math.min(a, b));
  }

  function numEntries(array) {
    return array.reduce(
      function (a, b) {
        if (b !== '' && b !== null) {
          return a + 1;
        } else {
          return a;
        }
      }, -1);
  }


  function getType(row) {
    const types = [
      'Median',
      'Net MFI',
      'Count',
      'Result',
      'Range',
      'Avg Net MFI',
      'Avg Result',
      'Avg Range',
      '% CV Replicates',
      '% Recovery',
      'Comments',
      'Units',
      'Standard Expected Concentration',
      'Control Expected Concentration',
      'Control Range - Low',
      'Control Range - High',
      'Per Bead Count',
      'Analysis Types',
      'Analysis Coefficients',
      'R^2'
    ];


    for (var t = 0; t < types.length; t++) {
      for (var i = 0; i < row.length; i++) {
        if (row[i].toUpperCase() === types[t].toUpperCase()) {
          return types[t];
        }
      }
    }

    return null;
  }

  // Looks for rows containing data type of interest using known table types.
  function findTypeRowsUsingTitles(sheet_arr, row_info) {
    var table_rows = [];

    // Could hard-code search for table types if they are consistently named.

    const types = [
      'Median',
      'Net MFI',
      'Count',
      'Result',
      'Range',
      'Avg Net MFI',
      'Avg Result',
      'Avg Range',
      '% CV Replicates',
      '% Recovery',
      'Comments',
      'Units',
      'Standard Expected Concentration',
      'Control Expected Concentration',
      'Control Range - Low',
      'Control Range - High',
      'Per Bead Count',
      'Analysis Types',
      'Analysis Coefficients',
      'R^2'
    ];

    for (var i = 0; i < sheet_arr.length; i++) {
      for (var j = 0; j < sheet_arr[i].length; j++) {
        if (!sheet_arr[i][j] || sheet_arr[i][j] === '') {
          continue;
        }

        for (var t = 0; t < types.length; t++) {
          if (sheet_arr[i][j].toUpperCase() === types[t].toUpperCase()) {
            table_rows.push(i);
          }
        }
      }
    }

    // Define start and end of each table.
    var table_row_boundaries = [];

    for (var i = 0; i < table_rows.length - 1; i++) {
      //table_row_boundaries.push({ start: table_rows[i] + 1, end: table_rows[i + 1] - 1, type: sheet_arr[table_rows[i]].join().replace(/,/g, '').trim()});
      table_row_boundaries.push({
        start: table_rows[i] + 1,
        end: table_rows[i + 1] - 1,
        type: getType(sheet_arr[table_rows[i]])
      });
    }

    //table_row_boundaries.push({start: table_rows[table_rows.length - 1] + 1, end: sheet_arr.length - 1, type: sheet_arr[table_rows[table_rows.length - 1]].join().replace(/,/g, '').trim()});
    table_row_boundaries.push({
      start: table_rows[table_rows.length - 1] + 1,
      end: sheet_arr.length - 1,
      type: getType(sheet_arr[table_rows.length - 1])
    });

    row_info['table_rows'] = table_row_boundaries;

    return row_info;
  }


  // Looks for rows with table headers / table types.
  function findTypeRows(sheet_arr, row_info) {
    var table_rows = [];

    // For now, assume that having 2 non-empty entries in a row, and containing 'DataType' in a cell is valid.

    for (var i = 0; i < sheet_arr.length; i++) {
      if (numEntries(sheet_arr[i]) === 2 && sheet_arr[i].indexOf('DataType:') !== -1) {
        table_rows.push(i);
      }
    }

    // Define start and end of each table.
    var table_row_boundaries = [];

    for (var i = 0; i < table_rows.length - 1; i++) {
      table_row_boundaries.push({
        start: table_rows[i] + 1,
        end: table_rows[i + 1] - 1,
        type: sheet_arr[table_rows[i]].join().replace(/,/g, '').trim()
      });
    }

    table_row_boundaries.push({
      start: table_rows[table_rows.length - 1] + 1,
      end: sheet_arr.length - 1,
      type: sheet_arr[table_rows[table_rows.length - 1]].join().replace(/,/g, '').trim()
    });

    row_info['table_rows'] = table_row_boundaries;

    return row_info;
  }


  // Find indices of rows with well locations, and changes some table boundaries based on where well locations end.

  function findWellRows(sheet_arr, row_info) {
    var well_coordinates = [];
    var cell_val;

    for (var r = 0; r < row_info['table_rows'].length; r++) {

      var table_end = row_info['table_rows'][r].start;

      // Goes through a hypothetical 'table' and finds the new end for it.

      for (var i = row_info['table_rows'][r].start; i <= row_info['table_rows'][r].end; i++) {
        for (var j = 0; j < sheet_arr[i].length; j++) {
          cell_val = sheet_arr[i][j];
          // Check for regex match with well coordinates.
          var pattern = /\([0-9]+,[a-z][0-9]+\)/i;
          if (pattern.exec(cell_val)) {
            well_coordinates.push({r: i, c: j});
            table_end = i;
          }
        }
      }

      // If relevant, find new end for table as defined by where well coordinates appear.
      if (table_end !== row_info['table_rows'][r].start) {
        row_info['table_rows'][r].end = table_end;
      }
    }

    row_info.well_coordinates = well_coordinates;

    return row_info;
  }

  // Helper function that determines if a particular row contains valid well location.
  function getWellCoordinates(well_coordinates, row_index) {
    for (var i = 0; i < well_coordinates.length; i++) {
      if (well_coordinates[i].r === row_index) {
        return (well_coordinates[i]);
      }
    }
    return {r: -1, c: -1};
  }

  // Find rows with analytes.
  function findAnalyteRows(sheet_arr, row_info) {
    var analyte_rows_set = new Set();

    // Preset list of analytes.

    const analytes = [
      'IL-17F',
      'GM-CSF',
      'IFNg',
      'IL-10',
      'CCL20/MIP3a',
      'IL-12p70',
      'IL-13',
      'IL-15',
      'IL-17A',
      'IL-22',
      'IL-9',
      'IL-1B',
      'IL-33',
      'IL-2',
      'IL-21',
      'IL-4',
      'IL-23',
      'IL-5',
      'IL-6',
      'IL-17E/IL-25',
      'IL-27',
      'IL-31',
      'TNFa',
      'TNFb',
      'IL-28A'
    ];

    // Names of special columns on the spreadsheet.
    const well_header_name = 'Location';
    const identifier_header_name = 'Sample';

    var cell_val;

    for (var r = 0; r < row_info['table_rows'].length; r++) {

      for (var i = row_info['table_rows'][r].start; i <= row_info['table_rows'][r].end; i++) {

        for (var j = 0; j < sheet_arr[i].length; j++) {

          cell_val = sheet_arr[i][j];

          if (!cell_val || cell_val === '') {
            continue;
          }

          if (typeof cell_val === 'string') {
            cell_val = cell_val.toUpperCase().trim();
          }

          for (var b = 0; b < analytes.length; b++) {

            if (cell_val === analytes[b].toUpperCase() && (sheet_arr[i].indexOf(identifier_header_name) !== -1 || sheet_arr[i].indexOf(identifier_header_name.toUpperCase()) !== -1)) {

              // May want to keep track of other things here.
              analyte_rows_set.add(i);
              row_info['table_rows'][r].start = i;

              // Map analytes to col indices.
              if (!row_info['table_rows'][r]['analyte_cols']) {
                row_info['table_rows'][r]['analyte_cols'] = [];
              }

              row_info['table_rows'][r]['analyte_cols'].push({'analyte': analytes[b], 'c': j});


            // TODO : Add header row info here, and then change indexes accordingly.
              row_info['table_rows'][r]['header_row'] = i;
            }
          }
        }
      }
    }

    var analyte_rows = Array.from(analyte_rows_set);
    analyte_rows.sort(function (a, b) {
      return a - b;
    });

    row_info.analyte_rows = analyte_rows;

    return row_info;
  }


  // Look for headers, such as sample, reagent etc.
  function findMiscHeaders(sheet_arr, row_info) {

    // Header names of interest.

    const well_header_name = 'Location';
    const identifier_header_name = 'Sample';

    for (var r = 0; r < row_info['table_rows'].length; r++) {
      for (var i = row_info['table_rows'][r].start; i <= row_info['table_rows'][r].end; i++) {


        if (sheet_arr[i].indexOf(identifier_header_name) !== -1) {
          row_info['table_rows'][r]['identifier_coordinates'] =  {r: i, c: sheet_arr[i].indexOf(identifier_header_name)} ;
        }

      }
    }

    return row_info;
  }

  function processWSOnly(ws) {

    const sheet_arr = XLSX.utils.sheet_to_json(ws, {header: 1});

    var row_info = new Object();

    row_info = findTypeRowsUsingTitles(sheet_arr, row_info);

    row_info = findMiscHeaders(sheet_arr, row_info);

    row_info = findWellRows(sheet_arr, row_info);

    row_info = findAnalyteRows(sheet_arr, row_info);

    // Names of special columns on the spreadsheet.
    const well_header_name = 'Location';
    const analyte_header_name = 'Sample';

    // Build up object.

    var formatted_data = [];
    var entry;

    // Process each table.

    for (var r = 0; r < row_info.table_rows.length; r++) {

      var identifier_coordinates = row_info['table_rows'][r]['identifier_coordinates'];

      var table_type = row_info['table_rows'][r]['type'];

      // Table does not have analyte-based info; this table will not be output and can be ignored.
      if (!row_info['table_rows'][r]['analyte_cols']) {
        continue;
      }

      // For each table, loop through rows.

      for (var i = row_info['table_rows'][r].start; i <= row_info['table_rows'][r].end; i++) {

        // Row of table may contain well coordinates.
        var row_well_coordinates = getWellCoordinates(row_info['well_coordinates'], i);

        // Check all possible analytes.

        for (var b = 0; b < row_info['table_rows'][r]['analyte_cols'].length; b++) {

          var analyte_name = row_info['table_rows'][r]['analyte_cols'][b]['analyte'];
          var analyte_col = row_info['table_rows'][r]['analyte_cols'][b]['c'];
          entry = new Object();
          entry['Analyte'] = analyte_name;
          var cell_val = sheet_arr[i][analyte_col];

          // Convert type of value as needed.
          if (cell_val === '') {
            entry['Value'] = '';
          }
          else if (!isNaN(cell_val)) {
            entry['Value'] = Number(cell_val);
          } else {
            entry['Value'] = cell_val;
          }

          if (row_well_coordinates.r !== -1) {
            entry['Location'] = sheet_arr[i][row_well_coordinates.c];
          }

          entry['Table Type'] = table_type;

          if (identifier_coordinates !== null) {
            entry['Identifier'] = sheet_arr[i][identifier_coordinates.c];
          }

          if (!(entry['Identifier'] === '' && entry['Value'] === '')) {
            formatted_data.push(entry);
          }

        }
      }
    }

    return formatted_data;
  }

  //
  // // Processes single XLSX JS worksheet and updates one Handsontable.
  // function processWS(ws, table_def, table) {
  //   // console.log("WORKSHEET", ws, table_def, table);
  //
  //   // Clear existing values in case user is submitting updated sheet after error.
  //   //table.clear();
  //
  //   // Default range for input section of spreadsheet, obtained from tables.json.
  //   var sheet_start = table_def.excel[0].start;
  //   var sheet_end = table_def.excel[0].end;
  //
  //   // Ranges for handsontable.
  //   var table_start = XLS.utils.decode_cell(sheet_start);
  //   var table_end = XLS.utils.decode_cell(sheet_end);
  //   var num_rows = table_end.r - table_start.r + 1;
  //   var num_cols = table_end.c - table_start.c + 1;
  //
  //   var changes = [];
  //
  //   // Keys of XLSX js worksheet.
  //   var ws_keys = Object.keys(ws);
  //
  //   // Default settings for matrix boundary.
  //   var matrix = XLSX.utils.sheet_to_json(ws, {raw: true, range: table_start.r, header: 1});
  //
  //   // console.log("MATRIX", matrix)
  //   // Check if default range is correct based on top row name.
  //   if (!(ws[XLS.utils.encode_cell({r: table_start.r, c: table_start.c - 1})] !== undefined &&
  //       ws[XLS.utils.encode_cell({r: table_start.r, c: table_start.c - 1})].v === table_def.excel[0].firstrow)) {
  //
  //
  //     var found_row = false;
  //
  //     // If table is not in expected position, get new boundaries.
  //     for (var i = 0; i < ws_keys.length; i++) {
  //       var key = ws_keys[i];
  //
  //       // Parse for location of top row name.
  //       if (ws[key].v !== undefined && ws[key].v !== null && table_def.excel[0].firstrow.toString() === ws[key].v.toString()) {
  //         // Update to boundaries of table (start, end, etc.)
  //         var new_start_row = Number(XLS.utils.decode_cell(key).r);
  //         var new_start_col = Number(XLS.utils.decode_cell(key).c) + 1;
  //         sheet_start = XLSX.utils.encode_cell({r: new_start_row, c: new_start_col});
  //         sheet_end = XLSX.utils.encode_cell({r: new_start_row + num_rows - 1, c: new_start_col + num_cols - 1});
  //         table_start = XLSX.utils.decode_cell(sheet_start);
  //         table_end = XLSX.utils.decode_cell(sheet_end);
  //         matrix = XLSX.utils.sheet_to_json(ws, {raw: true, range: table_start.r, header: 1});
  //         found_row = true;
  //         break;
  //       }
  //     }
  //
  //     // If expected row name not found.
  //     if (!found_row) {
  //       alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!',
  //         'Spreadsheet format does not match original template. Please copy-and-paste or type data into the ' +
  //         table_def.name + ' table manually.');
  //       return false;
  //     }
  //   }
  //
  //   // Filter array to get rid of undefined values/any headers.
  //   for (i = 0; i < matrix.length; i++) {
  //     matrix[i] = matrix[i].filter(function (cell) {
  //       return cell !== undefined && cell !== null && !isNaN(Number(cell));
  //     })
  //   }
  //
  //   // Parsing sometimes leads to empty rows, remove these.
  //   for (var j = matrix.length - 1; j >= 0; j--) {
  //     if (matrix[j].length === 0) {
  //       matrix.splice(j, 1);
  //     }
  //   }
  //
  //
  //   // Check that number of expected numeric cells is correct. Otherwise alert user.
  //   // Row and column checks.
  //   if (matrix.length !== num_rows) {
  //     alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!',
  //       'Spreadsheet format does not match original template, or there are empty cells, or non-numeric data. Please copy-and-paste or type data into the ' +
  //       table_def.name + ' table manually.');
  //     return false;
  //   }
  //
  //   for (i = 0; i < matrix.length; i++) {
  //     if (matrix[i].length !== num_cols) {
  //       alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!',
  //         'Spreadsheet format does not match original template, or there are empty cells, or non-numeric data. Please copy-and-paste or type data into the ' +
  //         table_def.name + ' table manually.');
  //       return false;
  //     }
  //   }
  //
  //   // For each sheet, set value in handsontable.
  //   for (var r = 0; r < num_rows; r++) {
  //     for (var c = 0; c < num_cols; c++) {
  //       changes.push([r, c, matrix[r][c]]);
  //     }
  //   }
  //
  //   if (changes.length > 0) {
  //     table.setDataAtCell(changes);
  //     return true;
  //   }
  //
  //   alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!',
  //     'Spreadsheet format does not match original template, or there are empty cells, or non-numeric data. Please copy-and-paste or type data into the ' +
  //     table_def.name + ' table manually.');
  //   return false;
  //
  // }

  // For drag-and-drop.

  function handleDrop(e) {

    if (typeof jQuery !== 'undefined') {
      e.stopPropagation();
      e.preventDefault();
      if (pending) {
        return opts.errors.pending();
      }
      // var files = e.dataTransfer.files;
      $('#drop-area').removeClass('dragenter');
      // readFile(files);
      opts.handle_file(e);
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'Drag and drop not supported. Please use the \'Choose File\' button or copy-and-paste data.');
    }

  }

  function handleDragover(e) {

    if (typeof jQuery !== 'undefined') {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      $('#drop-area').removeClass('dragdefault');
      $('#drop-area').addClass('dragenter');
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'Drag and drop not supported. Please use the \'Choose File\' button or copy-and-paste data.');
    }
  }

  function handleDragleave(e) {
    if (typeof jQuery !== 'undefined') {
      $('#drop-area').removeClass('dragenter');
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'Drag and drop not supported. Please use the \'Choose File\' button or copy-and-paste data.');
    }
  }

  function handleClick(e) {
    if (typeof jQuery !== 'undefined') {
      $('#choose-file').click();
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'Drag and drop not supported. Please use the \'Choose File\' button or copy-and-paste data.');
    }
  }

  if (opts.drop.addEventListener) {
    opts.drop.addEventListener('dragenter', handleDragover, false);
    opts.drop.addEventListener('dragleave', handleDragleave);
    opts.drop.addEventListener('dragover', handleDragover, false);
    opts.drop.addEventListener('drop', handleDrop, false);
    opts.choose.addEventListener('click', handleClick, false);
  }

  // For choosing a file using <input> (ie Choose File button).

  function handleFile(e) {
    var files;

    if (e.type === 'drop') {
      files = e.dataTransfer.files
    } else if (e.type === 'change') {
      files = e.target.files;
    }

    if (window.FileReader) {
      // FileReader is supported.
      readFile(files);
    } else {
      alertify.alert('<img src=\'/images/cancel.png\' alt=\'Error\'>Error!', 'FileReader is not supported in this browser.');
    }
  }

  if (opts.choose.addEventListener) {
    if (typeof jQuery !== 'undefined') {
      $('#choose-file').change(opts.handle_file);
    }
  }
};
