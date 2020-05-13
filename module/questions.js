(function (global) {
    let questions = {
        name: 'questions',
        style:{

        },
        template:`
            <div>
                <slot></slot>
                {{topic}}
            </div>
        `,
        props:{
            topic: String,
            topicSplit: {
                type: String
            },
            serialNumber: {
                type: String
            }
        },
        data: {

        },
        mounted: function () {

        },
        methods: {

        }
    }
    global.questions = questions;
})(this);