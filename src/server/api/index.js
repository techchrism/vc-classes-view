const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const axios = require('axios').default;
const cheerio = require('cheerio');
const htmlparser2 = require("htmlparser2");

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
        
        console.log('Posting data...');
        axios.post('https://ssb.vcccd.edu/prod/pw_pub_sched.p_listthislist', formData, {
            headers:
            {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((response) =>
        {
            console.log('Loading data...');
    
            const columnNames = ['status', 'crn', 'preCoreq', 'credits',
                '', '', '', '', '', '', '', '',
                'location', 'cap', 'act', 'rem', 'instructor', 'date', 'weeks'];
            let flags = {
                enteredTable: false,
                /*subjectHeader: false,
                crnHeader: false,
                newRow: false,
                classRow: false,*/
                getColumnText: false,
                currentClass: false
            };
            let state = {
                classData: {},
                className: {},
                subject: {},
                columns: [],
                currentColumn: {}
            };
            let classes = [];
            
            let addClass = () =>
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
            };
            let onRow = (columns) =>
            {
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
                    if(columns.length === 20 && !columns[0].attribs.class.startsWith('column_header'))
                    {
                        // New class
                        addClass();

                        flags.currentClass = true;

                        state.classData.status = columns[0].text.toLowerCase();
                        state.classData.crn = columns[1].text.trim();
                        state.classData.preCoreq = (columns[2].text.length !== 0);
                        state.classData.credits = columns[3].text.trim();
                        state.classData.days = '';
                        for(let i = 4; i < 11; i++)
                        {
                            state.classData.days += columns[i].text.trim();
                        }
                        state.classData.time = columns[11].text;
                        state.classData.location = columns[12].text;
                        state.classData.capacity = columns[13].text;
                        state.classData.actual = columns[14].text;
                        state.classData.remaining = columns[15].text;
                        state.classData.instructor = columns[16].text;
                        state.classData.date = columns[17].text;
                        state.classData.weeks = parseInt(columns[18].text);
                        state.classData.hasNote = (columns[19].text.length !== 0);
                    }
    
                    if(columns[0].text === 'End of report')
                    {
                        addClass();
                        console.log('Reached end');
                    }
                }
            };
            const parser = new htmlparser2.Parser({
                onopentag(name, attribs)
                {
                    if(name === 'table' && attribs.width === '100%')
                    {
                        flags.enteredTable = true;
                    }
    
                    if(flags.enteredTable && name === 'td')
                    {
                        state.currentColumn.attribs = attribs;
                        state.currentColumn.text = '';
                        flags.getColumnText = true;
                    }
                },
                ontext(text)
                {
                    state.currentColumn.text += text;
                },
                onclosetag(tagname)
                {
                    if(tagname === 'table' && flags.enteredTable)
                    {
                        flags.enteredTable = false;
                    }
                    
                    if(flags.getColumnText && tagname === 'td')
                    {
                        flags.getColumnText = false;
                        state.columns.push(state.currentColumn);
                        state.currentColumn = {};
                    }
                    
                    if(flags.enteredTable && tagname === 'tr')
                    {
                        onRow(state.columns);
                        state.columns = [];
                    }
                }
            }, {decodeEntities: true});
            parser.write(response.data);
            parser.end();
            
            res.send(JSON.stringify(classes, null, 4));
            
        }).catch(function (error)
        {
            console.log(error);
        });
    });
};
