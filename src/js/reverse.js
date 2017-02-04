import _ from "lodash";

// This is super hackish, and will likely break as Discord's internal API changes
// Anything using this or what it returns should be prepared to catch some exceptions
const getInternalInstance = e => e[Object.keys(e).find(k => k.startsWith("__reactInternalInstance"))];

export function getOwnerInstance(e, {include, exclude=["Popout", "Tooltip", "Scroller", "BackgroundFlash"]} = {}) {
    if (e === undefined) {
        return undefined;
    }

    // Set up filter; if no include filter is given, match all except those in exclude
    const excluding = include === undefined;
    const filter = excluding ? exclude : include;

    // Get displayName of the React class associated with this element
    // Based on getName(), but only check for an explicit displayName
    function getDisplayName(owner) {
        const type = owner._currentElement.type;
        const constructor = owner._instance && owner._instance.constructor;
        return type.displayName || constructor && constructor.displayName || null;
    }
    // Check class name against filters
    function classFilter(owner) {
        const name = getDisplayName(owner);
        return (name !== null && !!(filter.includes(name) ^ excluding));
    }

    // Walk up the hierarchy until a proper React object is found
    for (let prev, curr=getInternalInstance(e); !_.isNil(curr); prev=curr, curr=curr._hostParent) {
        // Before checking its parent, try to find a React object for prev among renderedChildren
        // This finds React objects which don't have a direct counterpart in the DOM hierarchy
        // e.g. Message, ChannelMember, ...
        if (prev !== undefined && !_.isNil(curr._renderedChildren)) {
            /* jshint loopfunc: true */
            let owner = Object.values(curr._renderedChildren)
                .find(v => !_.isNil(v._instance) && v.getHostNode() === prev.getHostNode());
            if (!_.isNil(owner) && classFilter(owner)) {
                return owner._instance;
            }
        }

        if (_.isNil(curr._currentElement)) {
            continue;
        }

        // Get a React object if one corresponds to this DOM element
        // e.g. .user-popout -> UserPopout, ...
        let owner = curr._currentElement._owner;
        if (!_.isNil(owner) && classFilter(owner)) {
            return owner._instance;
        }
    }

    return null;
}
