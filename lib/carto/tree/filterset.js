var tree = require('../tree');

tree.Filterset = function Filterset() {
    this.filters = {};
};

tree.Filterset.prototype.toXML = function(env) {
    var filters = [];
    for (var id in this.filters) {
        filters.push('(' + this.filters[id].toXML(env).trim() + ')');
    }
    if (filters.length) {
        return '    <Filter>' + filters.join(' and ') + '</Filter>\n';
    } else {
        return '';
    }
};

tree.Filterset.prototype.toString = function() {
    var arr = [];
    for (var id in this.filters) arr.push(this.filters[id].id);
    arr.sort();
    return arr.join('\t');
};

tree.Filterset.prototype.clone = function() {
    var clone = new tree.Filterset();
    for (var id in this.filters) {
        clone.filters[id] = this.filters[id];
    }
    return clone;
};

// Note: other has to be a tree.Filterset.
tree.Filterset.prototype.cloneWith = function(other) {
    var additions;
    for (var id in other.filters) {
        var status = this.addable(other.filters[id]);
        // status is true, false or null. if it's null we don't fail this
        // clone nor do we add the filter.
        if (status === false) {
            return false;
        }
        if (status === true) {
            // Adding the filter will override another value.
            if (!additions) additions = [];
            additions.push(other.filters[id]);
        }
    }

    // Adding the other filters doesn't make this filterset invalid, but it
    // doesn't add anything to it either.
    if (!additions) {
        return null;
    }

    // We can successfully add all filters. Now clone the filterset and add the
    // new rules.
    var clone = new tree.Filterset();

    // We can add the rules that are already present without going through the
    // add function as a Filterset is always in it's simplest canonical form.
    for (id in this.filters) {
        clone[id] = this.filters[id];
    }

    // Only add new filters that actually change the filter.
    while (id = additions.shift()) {
        clone.add(id);
    }

    return clone;
};

// Returns true when the new filter can be added, false otherwise.
// It can also return null, and on the other side we test for === true or
// false
tree.Filterset.prototype.addable = function(filter) {
    var key = filter.key,
        value = filter.val;

    switch (filter.op) {
        case '=':
            if (key + '=' in this.filters) return (this.filters[key + '='].val != value) ? false : null;
            if (key + '!=' + value in this.filters) return false;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return false;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return false;
            if (key + '>=' in this.filters && this.filters[key + '>='].val > value) return false;
            if (key + '<=' in this.filters && this.filters[key + '<='].val < value) return false;
            return true;

        case '=~':
            return true;

        case '!=':
            if (key + '=' in this.filters) return (this.filters[key + '='].val == value) ? false : null;
            if (key + '!=' + value in this.filters) return null;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return null;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return null;
            if (key + '>=' in this.filters && this.filters[key + '>='].val > value) return null;
            if (key + '<=' in this.filters && this.filters[key + '<='].val < value) return null;
            return true;

        case '>':
            if (key + '=' in this.filters) return (this.filters[key + '='].val <= value) ? false : null;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return false;
            if (key + '<=' in this.filters && this.filters[key + '<='].val <= value) return false;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return null;
            if (key + '>=' in this.filters && this.filters[key + '>='].val > value) return null;
            return true;

        case '>=':
            if (key + '=' in this.filters) return (this.filters[key + '='].val < value) ? false : null;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return false;
            if (key + '<=' in this.filters && this.filters[key + '<='].val < value) return false;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return null;
            if (key + '>=' in this.filters && this.filters[key + '>='].val >= value) return null;
            return true;

        case '<':
            if (key + '=' in this.filters) return (this.filters[key + '='].val >= value) ? false : null;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return false;
            if (key + '>=' in this.filters && this.filters[key + '>='].val >= value) return false;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return null;
            if (key + '<=' in this.filters && this.filters[key + '<='].val < value) return null;
            return true;

        case '<=':
            if (key + '=' in this.filters) return (this.filters[key + '='].val > value) ? false : null;
            if (key + '>' in this.filters && this.filters[key + '>'].val >= value) return false;
            if (key + '>=' in this.filters && this.filters[key + '>='].val > value) return false;
            if (key + '<' in this.filters && this.filters[key + '<'].val <= value) return null;
            if (key + '<=' in this.filters && this.filters[key + '<='].val <= value) return null;
            return true;
    }
};

// Only call this function for filters that have been cleared by .addable().
tree.Filterset.prototype.add = function(filter) {
    var key = filter.key, id, op = filter.op;

    if (op === '=') {
        for (id in this.filters) {
            if (this.filters[id].key == key) {
                delete this.filters[id];
            }
        }
        this.filters[key + '='] = filter;
    } else if (op === '!=') {
        this.filters[key + '!=' + filter.val] = filter;
    } else if (op === '=~') {
        this.filters[key + '=~' + filter.val] = filter;
    } else if (op === '>') {
        // If there are other filters that are also >
        // but are less than this one, they don't matter, so
        // remove them.
        for (id in this.filters) {
            if (this.filters[id].key == key && this.filters[id].val <= filter.val) {
                delete this.filters[id];
            }
        }
        this.filters[key + '>'] = filter;
    } else if (op === '>=') {
        for (id in this.filters) {
            if (this.filters[id].key == key && this.filters[id].val < filter.val) {
                delete this.filters[id];
            }
        }
        if (key + '!=' + filter.val in this.filters) {
            delete this.filters[key + '!=' + filter.val];
            filter.op = '>';
            this.filters[key + '>'] = filter;
        }
        else {
            this.filters[key + '>='] = filter;
        }
    } else if (op === '<') {
        for (id in this.filters) {
            if (this.filters[id].key == key && this.filters[id].val >= filter.val) {
                delete this.filters[id];
            }
        }
        this.filters[key + '<'] = filter;
    } else if (op === '<=') {
        for (id in this.filters) {
            if (this.filters[id].key == key && this.filters[id].val > filter.val) {
                delete this.filters[id];
            }
        }
        if (key + '!=' + filter.val in this.filters) {
            delete this.filters[key + '!=' + filter.val];
            filter.op = '<';
            this.filters[key + '<'] = filter;
        }
        else {
            this.filters[key + '<='] = filter;
        }
    }
};