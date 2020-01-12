const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios').default;
const cheerio = require('cheerio');
const htmlparser2 = require('htmlparser2');

// Initialize the API
module.exports = (app) =>
{
    app.use(helmet());
    
    app.get('/api/v1/options', cors(), (req, res) =>
    {
        axios.get('https://ssb.vcccd.edu/prod/pw_pub_sched.P_Simple_SEARCH').then((response) =>
        {
            const $ = cheerio.load(response.data);
            const terms = [];
            const locations = [];
            
            $('select[name="term"]').children().each((i, item) =>
            {
                terms.push({
                    name: item.children[0].data,
                    value: item.attribs.value
                });
            });
    
            $('select[name="sel_camp"]').children().each((i, item) =>
            {
                if(item.attribs.value )
                terms.push({
                    name: item.children[0].data,
                    value: item.attribs.value
                });
            });
            
            res.send(JSON.stringify(terms, null, 4));
        });
    });
    
    // Parameter definitions for the POST request
    const locations = {
        moorpark: 1,
        oxnard: 2,
        ventura: 3
    };
    const seasons = {
        spring: {
            term: '03',
            desc: 'Spring'
        },
        summer: {
            term: '05',
            desc: 'Summer'
        },
        fall: {
            term: '07',
            desc: 'Fall'
        }
    };
    const formStr = '&sel_subj=dummy&sel_day=dummy&sel_schd=dummy&sel_camp=dummy&sel_sess=dummy&sel_instr=dummy&sel_instr=%25&sel_ptrm=dummy&sel_ptrm=%25&begin_hh=5&begin_mi=0&begin_ap=a&end_hh=11&end_mi=0&end_ap=p&sel_subj=%25&sel_camp=1&aa=N';
    
    app.get('/api/v1/:location/:season-:year', cors(), (req, res) =>
    {
        // Verify params are correctly formatted
        if(!locations.hasOwnProperty(req.params.location))
        {
            res.status(400);
            res.send({
                error: 'Location must be one of ' + Object.keys(locations).toString()
            });
            return;
        }
        
        if(!seasons.hasOwnProperty(req.params.season.toLowerCase()))
        {
            res.status(400);
            res.send({
                error: 'Season must be one of ' + Object.keys(seasons).toString()
            });
            return;
        }
        
        if(req.params.year.length !== 4 || isNaN(req.params.year))
        {
            res.status(400);
            res.send({
                error: 'Year must be a valid year'
            });
            return;
        }
        
        // Prepare the post query for the vcccd form
        const formData = 'TERM=' + req.params.year + seasons[req.params.season.toLowerCase()].term +
            '&TERM_DESC=' + seasons[req.params.season.toLowerCase()].desc + '%20' + req.params.year + formStr;
        
        // Send the POST request
        axios.post('https://ssb.vcccd.edu/prod/pw_pub_sched.p_listthislist', formData, {
            headers:
            {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((response) =>
        {
            // Flags for parsing the html data
            let flags = {
                // True when in the primary table (rows contain classes)
                enteredTable: false,
                // True when in a column with the desire to save column text to state
                getColumnText: false,
                // True when currently reading/creating a class
                currentClass: false,
                // True when the center tag has been encountered and the data is to be saved
                // Used for confirming the number of classes ("You have 1234 class(es) displayed....")
                centerTag: false
            };
            // State for parsing the html data
            let state = {
                // Object for the current class data
                classData: {},
                // Object that holds the class name info (code, name)
                className: {},
                // Object that holds the class subject info (code, name)
                subject: {},
                // Holds all the columns for a single row. Used to parse row-by-row rather than tag-by-tag
                columns: [],
                // Current column data (attribs, text). Gets added to the columns array.
                currentColumn: {}
            };
            // Finalized classes
            let classes = [];
            let numClasses = '';
            
            // Finalizes the class if one is in progress
            function addClass()
            {
                if(flags.currentClass)
                {
                    classes.push({
                        name: state.className,
                        subject: state.subject,
                        ...state.classData
                    });
                    state.classData = {};
                    flags.currentClass = false;
                }
            }
            
            // Fills in the information *before* the time columns
            function fillPreTime(columns, obj, offset)
            {
                obj.status = columns[offset].text.toLowerCase();
                obj.crn = columns[offset + 1].text.trim();
                obj.preCoreq = (columns[offset + 2].text.length !== 0);
                obj.credits = columns[offset + 3].text.trim();
            }
            
            // Fills in the information *after* the time columns
            function fillPostTime(columns, obj, offset)
            {
                obj.location = columns[offset].text.trim();
                obj.capacity = parseInt(columns[offset + 1].text);
                obj.actual = parseInt(columns[offset + 2].text);
                obj.remaining = parseInt(columns[offset + 3].text);
                obj.instructor = columns[offset + 4].text;
                obj.date = columns[offset + 5].text;
                obj.weeks = parseInt(columns[offset + 6].text);
                obj.hasNote = (columns[offset + 7].text.length !== 0);
            }
            
            // Callback function that gets called whenever a full row has been parsed
            function onRow(columns)
            {
                // if the column length is 1, it's a class/subject header
                if(columns.length === 1)
                {
                    addClass();
                    if(columns[0].attribs.class === 'subject_header')
                    {
                        let parts = columns[0].text.split(' - ');
                        state.subject = {
                            code: parts[0].trim(),
                            name: parts[1].trim()
                        };
                    }
                    else if(columns[0].attribs.class === 'crn_header')
                    {
                        let parts = columns[0].text.split(' - ');
                        state.className = {
                            code: parts[0].trim(),
                            name: parts[1].trim()
                        };
                    }
                }
                else
                {
                    // Ignore table headers
                    if(columns[0].attribs.hasOwnProperty('class') && columns[0].attribs.class.startsWith('column_header'))
                    {
                        return;
                    }
                    
                    // If the row is 20 columns, it's a full row with a new class in it
                    if(columns.length === 20)
                    {
                        // Finalize any prior classes
                        addClass();
                        flags.currentClass = true;
                        
                        // Fill in data
                        fillPreTime(columns, state.classData, 0);
                        state.classData.days = '';
                        for(let i = 4; i < 11; i++)
                        {
                            state.classData.days += columns[i].text.trim();
                        }
                        state.classData.time = columns[11].text;
                        fillPostTime(columns, state.classData, 12);
                    }
                    else if(columns.length === 13)
                    {
                        // If the row is 13 columns, it's a new class just without the class day info
                        addClass();
                        flags.currentClass = true;
                        
                        // 7 columns shorter from missing day info
                        fillPreTime(columns, state.classData, 0);
                        if(columns[4].text.trim().startsWith('Distance Education Class'))
                        {
                            state.classData.distanceEducation = true;
                        }
                        else
                        {
                            state.classData.otherTime = columns[4].text.trim();
                        }
                        fillPostTime(columns, state.classData, 5);
                    }
                    else if(columns[0].text === 'End of report')
                    {
                        // Finalize last class when the end has been reached
                        addClass();
                        console.log('Reached end');
                    }
                    else if(columns[1].text === '&')
                    {
                        // Extra information for the class in the prior row
                        // First column is empty, second is "&"
                        if(columns.length === 3)
                        {
                            // Three columns means an extra note
                            state.classData.extraNote = columns[2].text.trim();
                        }
                        else if(columns.length === 14)
                        {
                            // 14 columns is a full extra date/time row (for some classes with labs)
                            state.classData.extraDays = '';
                            for(let i = 2; i < 9; i++)
                            {
                                state.classData.extraDays += columns[i].text.trim();
                            }
                            state.classData.extraTime = columns[9].text.trim();
                            state.classData.extraLocation = columns[10].text.trim();
                            state.classData.extraDate = columns[12].text.trim();
                        }
                        else if(columns.length === 7)
                        {
                            // 7 columns is a partial extra date/time row (for partial distance classes or TBA info)
                            state.classData.extraTime = columns[3].text.trim();
                            state.classData.extraLocation = columns[4].text.trim();
                            state.classData.extraDate = columns[6].text.trim();
                        }
                    }
                }
            }
            
            // Use htmlparser2 instead of cheerio for speed
            // Constructing a full DOM isn't necessary
            const parser = new htmlparser2.Parser({
                onopentag(name, attribs)
                {
                    // Flag when the main table has been entered
                    if(name === 'table' && attribs.width === '100%')
                    {
                        flags.enteredTable = true;
                    }
    
                    // Flag to read column text in the main table
                    if(flags.enteredTable && name === 'td')
                    {
                        state.currentColumn.attribs = attribs;
                        state.currentColumn.text = '';
                        flags.getColumnText = true;
                    }
                    
                    // Flag to read the center tag
                    if(name === 'center')
                    {
                        flags.centerTag = true;
                    }
                },
                ontext(text)
                {
                    // Save column text or center tag if either flags
                    if(flags.getColumnText)
                    {
                        state.currentColumn.text += text;
                    }
                    else if(flags.centerTag)
                    {
                        flags.centerTag = false;
                        numClasses = text.trim();
                    }
                },
                onclosetag(tagname)
                {
                    // When the main table is exited
                    if(tagname === 'table' && flags.enteredTable)
                    {
                        flags.enteredTable = false;
                    }
                    
                    // Save the column when it's exited
                    if(flags.getColumnText && tagname === 'td')
                    {
                        flags.getColumnText = false;
                        state.columns.push(state.currentColumn);
                        state.currentColumn = {};
                    }
                    
                    // Trigger the "onRow" callback when a full fow has finished
                    if(flags.enteredTable && tagname === 'tr')
                    {
                        onRow(state.columns);
                        state.columns = [];
                    }
                }
            }, {decodeEntities: true});
            parser.write(response.data);
            parser.end();
            
            // Send the classes as JSON and compare in console
            res.send(JSON.stringify(classes, null, 4));
            console.log(numClasses);
            console.log('(got ' + classes.length + ' of them)');
        }).catch(function (error)
        {
            console.log(error);
        });
    });
};
