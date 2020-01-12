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
            
            let flags = {
                enteredTable: false,
                getColumnText: false,
                currentClass: false,
                centerTag: false
            };
            let state = {
                classData: {},
                className: {},
                subject: {},
                columns: [],
                currentColumn: {}
            };
            let classes = [];
            let numClasses = '';
            
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
            let fillPreTime = (columns, obj, offset) =>
            {
                obj.status = columns[offset].text.toLowerCase();
                obj.crn = columns[offset + 1].text.trim();
                obj.preCoreq = (columns[offset + 2].text.length !== 0);
                obj.credits = columns[offset + 3].text.trim();
            };
            let fillPostTime = (columns, obj, offset) =>
            {
                obj.location = columns[offset].text.trim();
                obj.capacity = columns[offset + 1].text;
                obj.actual = columns[offset + 2].text;
                obj.remaining = columns[offset + 3].text;
                obj.instructor = columns[offset + 4].text;
                obj.date = columns[offset + 5].text;
                obj.weeks = parseInt(columns[offset + 6].text);
                obj.hasNote = (columns[offset + 7].text.length !== 0);
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
                    if(columns[0].attribs.hasOwnProperty('class') && columns[0].attribs.class.startsWith('column_header'))
                    {
                        return;
                    }
                    
                    if(columns.length === 20)
                    {
                        // New class
                        addClass();
                        flags.currentClass = true;
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
                        addClass();
                        console.log('Reached end');
                    }
                    else if(columns[1].text === '&')
                    {
                        // Extra information for the class in the last row
                        if(columns.length === 3)
                        {
                            state.classData.extraNote = columns[2].text.trim();
                        }
                        else if(columns.length === 14)
                        {
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
                            state.classData.extraTime = columns[3].text.trim();
                            state.classData.extraLocation = columns[4].text.trim();
                            state.classData.extraDate = columns[6].text.trim();
                        }
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
                    
                    if(name === 'center')
                    {
                        flags.centerTag = true;
                    }
                },
                ontext(text)
                {
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
            console.log(numClasses);
            console.log('(got ' + classes.length + ' of them)');
            
        }).catch(function (error)
        {
            console.log(error);
        });
    });
};
