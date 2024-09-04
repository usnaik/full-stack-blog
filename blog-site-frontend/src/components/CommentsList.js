const CommentsList = ( {comments} ) => (
    <>
    <h3>Comments:</h3>
    {comments.map((comment,idx) => (
        <div className="comment" key={idx}  >
            <h4> {comment.postedBy} </h4>
            <p> {comment.text} </p>
        </div>
    ))}
    </>
)
// key={comment.postedBy +":"+ comment.text}  
export default CommentsList;